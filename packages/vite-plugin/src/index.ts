import path from "node:path";
import ts from "typescript";
import type { Plugin, ResolvedConfig } from "vite";

// 业务入口导入此虚拟模块；前导 \0 的内部 ID 可防止 Vite 再次按文件路径解析。
const VIRTUAL_ID = "virtual:separa/registry";
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

export interface SeparaPluginOptions {
  readonly tsconfig?: string;
  readonly debugOutput?: string | false;
  readonly declarationOutput?: string | false;
  readonly profile?: string;
  /** 契约规范化 ID 或接口名到 qualifier 的默认绑定。 */
  readonly defaultBindings?: Readonly<Record<string, string>>;
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  /** 仅保留这些入口静态可达的服务，用于代码分包和 Tree-shaking。 */
  readonly entries?: readonly string[];
}

/** TypeChecker 扫描后、生成代码前使用的规范化服务模型。 */
interface ServiceInfo {
  readonly node: ts.ClassDeclaration;
  readonly symbol: ts.Symbol;
  readonly file: string;
  readonly exportName: string;
  readonly id: string;
  readonly scope: "singleton" | "transient" | "request";
  readonly multi: boolean;
  readonly qualifier?: string;
  readonly profiles: readonly string[];
  readonly stateKeys: string[];
  readonly methodKeys: string[];
  readonly interfaces: ts.Symbol[];
  readonly explicitToken?: ts.Symbol;
  readonly dependencies: DependencyInfo[];
}

interface DependencyInfo {
  readonly typeSymbol: ts.Symbol;
  readonly explicitToken?: ts.Symbol;
  readonly optional?: boolean;
  readonly multiple?: boolean;
  readonly qualifier?: string;
}

interface RuntimeImport {
  readonly symbol: ts.Symbol;
  readonly file: string;
  readonly exportName: string;
}

function decoratorsOf(node: ts.Node): readonly ts.Decorator[] {
  return ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
}

function decoratorName(decorator: ts.Decorator): string | undefined {
  const expression = ts.isCallExpression(decorator.expression) ? decorator.expression.expression : decorator.expression;
  return ts.isIdentifier(expression) ? expression.text : undefined;
}

function decoratorCall(node: ts.Node, name: string): ts.CallExpression | undefined {
  const decorator = decoratorsOf(node).find((item) => decoratorName(item) === name);
  return decorator && ts.isCallExpression(decorator.expression) ? decorator.expression : undefined;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node) && !!ts.getModifiers(node)?.some((modifier) => modifier.kind === kind);
}

function isPublic(node: ts.Node): boolean {
  return !hasModifier(node, ts.SyntaxKind.PrivateKeyword) && !hasModifier(node, ts.SyntaxKind.ProtectedKeyword);
}

function propertyName(node: ts.PropertyName | undefined): string | undefined {
  return node && (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) ? node.text : undefined;
}

function serviceOptions(node: ts.ClassDeclaration): ts.ObjectLiteralExpression | undefined {
  const options = decoratorCall(node, "Service")?.arguments[0];
  return options && ts.isObjectLiteralExpression(options) ? options : undefined;
}

function optionAssignment(options: ts.ObjectLiteralExpression | undefined, name: string): ts.PropertyAssignment | undefined {
  return options?.properties.find(
    (property): property is ts.PropertyAssignment => ts.isPropertyAssignment(property) && propertyName(property.name) === name,
  );
}

function serviceScope(node: ts.ClassDeclaration): ServiceInfo["scope"] {
  const options = serviceOptions(node);
  if (!options || !ts.isObjectLiteralExpression(options)) return "transient";
  const scope = optionAssignment(options, "scope");
  if (scope && ts.isStringLiteral(scope.initializer)) {
    const value = scope.initializer.text;
    if (value === "singleton" || value === "request" || value === "transient") return value;
  }
  return "transient";
}

function serviceMulti(node: ts.ClassDeclaration): boolean {
  const multi = optionAssignment(serviceOptions(node), "multi");
  return !!multi && multi.initializer.kind === ts.SyntaxKind.TrueKeyword;
}

function serviceQualifier(node: ts.ClassDeclaration): string | undefined {
  const qualifier = optionAssignment(serviceOptions(node), "qualifier");
  return qualifier && ts.isStringLiteral(qualifier.initializer) ? qualifier.initializer.text : undefined;
}

function serviceProfiles(node: ts.ClassDeclaration): readonly string[] {
  const profile = optionAssignment(serviceOptions(node), "profile")?.initializer;
  if (!profile) return [];
  if (ts.isStringLiteral(profile)) return [profile.text];
  if (ts.isArrayLiteralExpression(profile) && profile.elements.every(ts.isStringLiteral)) {
    return profile.elements.map((item) => (item as ts.StringLiteral).text);
  }
  throw new Error(`[Separa] @Service({ profile }) on ${node.name?.text ?? "anonymous service"} requires a string or string array.`);
}

function normalizedPath(value: string): string {
  return value.split(path.sep).join("/");
}

function globExpression(pattern: string): RegExp {
  const escaped = normalizedPath(pattern)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replaceAll("**", "\u0000")
    .replaceAll("*", "[^/]*")
    .replaceAll("\u0000", ".*");
  return new RegExp(`^${escaped}$`);
}

function inScanRange(file: string, root: string, options: SeparaPluginOptions): boolean {
  const relative = normalizedPath(path.relative(root, file));
  const included = !options.include?.length || options.include.some((pattern) => globExpression(pattern).test(relative));
  const excluded = options.exclude?.some((pattern) => globExpression(pattern).test(relative)) ?? false;
  return included && !excluded;
}

function normalizedId(root: string, file: string, exportName: string): string {
  const relative = path.relative(root, file).split(path.sep).join("/");
  return `@app/${relative}#${exportName}`;
}

/** Alias Symbol 必须还原到声明 Symbol，否则跨文件 import 会被误判为不同接口。 */
function canonicalSymbol(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function expressionSymbol(checker: ts.TypeChecker, expression: ts.Expression, usage: string): ts.Symbol {
  if (!ts.isIdentifier(expression)) {
    throw new Error(`[Separa] ${usage} must reference an exported Token identifier.`);
  }
  const symbol = checker.getSymbolAtLocation(expression);
  if (!symbol) throw new Error(`[Separa] Cannot resolve Token ${expression.text} used by ${usage}.`);
  return canonicalSymbol(checker, symbol);
}

function explicitServiceToken(checker: ts.TypeChecker, node: ts.ClassDeclaration): ts.Symbol | undefined {
  const token = optionAssignment(serviceOptions(node), "token");
  return token ? expressionSymbol(checker, token.initializer, `@Service({ token }) on ${node.name?.text ?? "anonymous service"}`) : undefined;
}

function explicitDependencyToken(checker: ts.TypeChecker, parameter: ts.ParameterDeclaration): ts.Symbol | undefined {
  const call = decoratorCall(parameter, "Inject") ?? decoratorCall(parameter, "Optional") ?? decoratorCall(parameter, "InjectMany");
  const token = call?.arguments[0];
  return token ? expressionSymbol(checker, token, `@Inject() on constructor parameter ${parameter.name.getText()}`) : undefined;
}

function dependencyFlags(parameter: ts.ParameterDeclaration): Pick<DependencyInfo, "optional" | "multiple"> {
  if (decoratorCall(parameter, "Optional")) return { optional: true };
  if (decoratorCall(parameter, "InjectMany")) return { multiple: true };
  return {};
}

function dependencyQualifier(parameter: ts.ParameterDeclaration): string | undefined {
  const call = decoratorCall(parameter, "Qualifier");
  const value = call?.arguments[0];
  if (!value) return undefined;
  if (!ts.isStringLiteral(value)) throw new Error(`[Separa] @Qualifier() on parameter ${parameter.name.getText()} requires a string.`);
  return value.text;
}

function analyzedDependencyType(
  checker: ts.TypeChecker,
  parameter: ts.ParameterDeclaration,
): { readonly symbol?: ts.Symbol; readonly optional: boolean; readonly multiple: boolean } {
  // 问号或 undefined 联合类型表示 Optional；数组/元组表示多重注入。
  const declaredType = checker.getTypeAtLocation(parameter);
  const optional = !!parameter.questionToken || (declaredType.isUnion() && declaredType.types.some((type) => (type.flags & ts.TypeFlags.Undefined) !== 0));
  const type = optional ? checker.getNonNullableType(declaredType) : declaredType;
  const multiple = checker.isArrayType(type) || checker.isTupleType(type) || type.symbol?.name === "ReadonlyArray";
  const dependencyType = multiple && (type.flags & ts.TypeFlags.Object) !== 0 ? checker.getTypeArguments(type as ts.TypeReference)[0] : type;
  const symbol = dependencyType?.aliasSymbol ?? dependencyType?.symbol;
  return { ...(symbol ? { symbol: canonicalSymbol(checker, symbol) } : {}), optional, multiple };
}

function runtimeImport(checker: ts.TypeChecker, symbol: ts.Symbol, root: string): RuntimeImport {
  const declaration = symbol.declarations?.[0];
  if (!declaration) throw new Error(`[Separa] Runtime Token ${symbol.name} has no declaration.`);
  const sourceFile = declaration.getSourceFile();
  if (sourceFile.isDeclarationFile || sourceFile.fileName.includes("node_modules")) {
    throw new Error(`[Separa] Runtime Token ${symbol.name} must be exported from application source so it can be statically resolved.`);
  }
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  const exported = moduleSymbol && checker.getExportsOfModule(moduleSymbol).some((candidate) => canonicalSymbol(checker, candidate) === symbol);
  if (!exported) {
    throw new Error(`[Separa] Runtime Token ${symbol.name} must be exported from ${normalizedId(root, sourceFile.fileName, symbol.name)}.`);
  }
  return { symbol, file: sourceFile.fileName, exportName: symbol.name };
}

function memberCategory(member: ts.ClassElement): "state" | "method" | "getter" | undefined {
  if (ts.isPropertyDeclaration(member)) return "state";
  if (ts.isMethodDeclaration(member)) return "method";
  if (ts.isGetAccessorDeclaration(member)) return "getter";
  return undefined;
}

function inheritedClasses(checker: ts.TypeChecker, node: ts.ClassDeclaration): ts.ClassDeclaration[] {
  const result: ts.ClassDeclaration[] = [];
  let current = node;
  while (true) {
    const heritage = current.heritageClauses?.find((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword)?.types[0];
    if (!heritage) break;
    const parent = checker.getTypeAtLocation(heritage).symbol?.declarations?.find(ts.isClassDeclaration);
    if (!parent) break;
    result.push(parent);
    current = parent;
  }
  return result;
}

function validateInheritedMembers(checker: ts.TypeChecker, node: ts.ClassDeclaration): void {
  for (const member of node.members) {
    if (!isPublic(member) || hasModifier(member, ts.SyntaxKind.StaticKeyword)) continue;
    const name = propertyName(member.name);
    const category = memberCategory(member);
    if (!name || !category) continue;
    for (const parent of inheritedClasses(checker, node)) {
      const conflict = parent.members.find((candidate) => isPublic(candidate) && propertyName(candidate.name) === name);
      if (!conflict) continue;
      const inheritedCategory = memberCategory(conflict);
      if (category === "method" && inheritedCategory === "method") continue;
      const source = node.getSourceFile();
      const location = source.getLineAndCharacterOfPosition(member.getStart());
      throw new Error(
        `[Separa] Inherited reactive member conflict ${node.name?.text ?? "anonymous"}.${name} at ${source.fileName}:${location.line + 1}:${location.character + 1}.`,
      );
    }
  }
}

/** 扫描所有应用源码，将 @Service()、成员和构造参数归一化为 ServiceInfo。 */
function collectServices(program: ts.Program, root: string, options: SeparaPluginOptions): ServiceInfo[] {
  const checker = program.getTypeChecker();
  const services: ServiceInfo[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile || sourceFile.fileName.includes("/node_modules/") || sourceFile.fileName.includes("\\node_modules\\")) continue;
    if (!inScanRange(sourceFile.fileName, root, options)) continue;
    for (const statement of sourceFile.statements) {
      if (!ts.isClassDeclaration(statement) || !statement.name) continue;
      if (!decoratorsOf(statement).some((item) => decoratorName(item) === "Service")) continue;
      if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
        throw new Error(`[Separa] ${sourceFile.fileName}:${statement.getStart()} Service class ${statement.name.text} must be exported.`);
      }

      const profiles = serviceProfiles(statement);
      if (profiles.length > 0 && (!options.profile || !profiles.includes(options.profile))) continue;
      validateInheritedMembers(checker, statement);

      const symbol = checker.getSymbolAtLocation(statement.name);
      if (!symbol) continue;

      // implements 关系决定多个实现是否共享同一个生成契约 Token。
      const interfaces =
        statement.heritageClauses
          ?.filter((clause) => clause.token === ts.SyntaxKind.ImplementsKeyword)
          .flatMap((clause) => clause.types)
          .map((heritageType) => checker.getTypeAtLocation(heritageType).symbol)
          .filter((contract): contract is ts.Symbol => !!contract)
          .map((contract) => canonicalSymbol(checker, contract)) ?? [];

      const constructor = statement.members.find(ts.isConstructorDeclaration);
      const dependencies =
        constructor?.parameters.map((parameter) => {
          const analyzed = analyzedDependencyType(checker, parameter);
          const explicitToken = explicitDependencyToken(checker, parameter);
          if (!analyzed.symbol && !explicitToken) {
            const location = sourceFile.getLineAndCharacterOfPosition(parameter.getStart());
            throw new Error(
              `[Separa] Cannot resolve constructor dependency ${statement.name!.text} at ${sourceFile.fileName}:${location.line + 1}:${location.character + 1}.`,
            );
          }
          const flags = dependencyFlags(parameter);
          const qualifier = dependencyQualifier(parameter);
          return {
            typeSymbol: analyzed.symbol ?? explicitToken!,
            ...(explicitToken ? { explicitToken } : {}),
            ...(flags.optional || analyzed.optional ? { optional: true } : {}),
            ...(flags.multiple || analyzed.multiple ? { multiple: true } : {}),
            ...(qualifier ? { qualifier } : {}),
          };
        }) ?? [];

      const stateKeys: string[] = [];
      const methodKeys: string[] = [];

      // 公开可写字段进入隐藏响应式状态；方法会在增强阶段稳定绑定。
      for (const member of statement.members) {
        if (!isPublic(member) || hasModifier(member, ts.SyntaxKind.StaticKeyword)) continue;
        const name = propertyName(member.name);
        if (!name) continue;
        if (ts.isPropertyDeclaration(member)) {
          if (hasModifier(member, ts.SyntaxKind.ReadonlyKeyword)) continue;
          if (decoratorsOf(member).some((item) => decoratorName(item) === "NonReactive")) continue;
          const type = checker.getTypeAtLocation(member);
          if (type.getCallSignatures().length > 0) methodKeys.push(name);
          else stateKeys.push(name);
        } else if (ts.isMethodDeclaration(member)) {
          methodKeys.push(name);
        }
      }

      const explicitToken = explicitServiceToken(checker, statement);
      const qualifier = serviceQualifier(statement);
      services.push({
        node: statement,
        symbol,
        file: sourceFile.fileName,
        exportName: statement.name.text,
        id: normalizedId(root, sourceFile.fileName, statement.name.text),
        scope: serviceScope(statement),
        multi: serviceMulti(statement),
        ...(qualifier ? { qualifier } : {}),
        profiles,
        stateKeys,
        methodKeys,
        interfaces,
        dependencies,
        ...(explicitToken ? { explicitToken } : {}),
      });
    }
  }

  return services;
}

function entryReachableFiles(program: ts.Program, root: string, entries: readonly string[]): Set<string> {
  const reachable = new Set<string>();
  const queue = entries.map((entry) => path.resolve(root, entry));
  const sourceByPath = new Map(program.getSourceFiles().map((source) => [path.normalize(source.fileName), source]));
  while (queue.length) {
    const file = path.normalize(queue.pop()!);
    if (reachable.has(file)) continue;
    reachable.add(file);
    const source = sourceByPath.get(file);
    if (!source) continue;
    const visit = (node: ts.Node): void => {
      let specifier: string | undefined;
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        specifier = node.moduleSpecifier.text;
      } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteral(argument)) specifier = argument.text;
      }
      if (specifier) {
        const resolved = ts.resolveModuleName(specifier, source.fileName, program.getCompilerOptions(), ts.sys).resolvedModule?.resolvedFileName;
        if (resolved && !resolved.includes("node_modules")) queue.push(path.normalize(resolved));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return reachable;
}

function selectEntryServices(program: ts.Program, root: string, services: ServiceInfo[], entries: readonly string[] | undefined): ServiceInfo[] {
  if (!entries?.length) return services;
  const reachable = entryReachableFiles(program, root, entries);
  const selected = new Set(services.filter((service) => reachable.has(path.normalize(service.file))));
  const bySymbol = new Map(services.map((service) => [service.symbol, service]));
  const implementations = new Map<ts.Symbol, ServiceInfo[]>();
  for (const service of services) {
    for (const contract of service.interfaces) {
      const candidates = implementations.get(contract) ?? [];
      candidates.push(service);
      implementations.set(contract, candidates);
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const service of [...selected]) {
      for (const dependency of service.dependencies) {
        const candidates = bySymbol.get(dependency.typeSymbol)
          ? [bySymbol.get(dependency.typeSymbol)!]
          : (implementations.get(dependency.typeSymbol) ?? []);
        for (const candidate of candidates) {
          if (!selected.has(candidate)) {
            selected.add(candidate);
            changed = true;
          }
        }
      }
    }
  }
  return services.filter((service) => selected.has(service));
}

/** 解析依赖图并输出 virtual:separa/registry 的可执行 TypeScript 模块。 */
function generateRegistry(program: ts.Program, root: string, options: SeparaPluginOptions): string {
  const checker = program.getTypeChecker();
  const services = selectEntryServices(program, root, collectServices(program, root, options), options.entries);
  const bySymbol = new Map(services.map((service) => [service.symbol, service]));
  const explicitTokenOwners = new Map<ts.Symbol, ServiceInfo[]>();
  const implementations = new Map<ts.Symbol, ServiceInfo[]>();
  for (const service of services) {
    if (service.explicitToken) {
      const previous = explicitTokenOwners.get(service.explicitToken) ?? [];
      if (previous.length > 0 && (!service.multi || !previous.some((candidate) => candidate.multi))) {
        throw new Error(
          `[Separa] Duplicate explicit Token ${service.explicitToken.name}: ${previous[0]!.id} and ${service.id}. Use a distinct Token or multi: true.`,
        );
      }
      previous.push(service);
      explicitTokenOwners.set(service.explicitToken, previous);
    }
    for (const contract of service.interfaces) {
      const candidates = implementations.get(contract) ?? [];
      candidates.push(service);
      implementations.set(contract, candidates);
    }
  }
  for (const [contract, candidates] of implementations) {
    const qualifiers = new Map<string, ServiceInfo>();
    for (const candidate of candidates) {
      if (!candidate.qualifier) continue;
      const previous = qualifiers.get(candidate.qualifier);
      if (previous) {
        throw new Error(
          `[Separa] Duplicate qualifier ${JSON.stringify(candidate.qualifier)} for ${checker.getFullyQualifiedName(contract)}: ${previous.id} and ${candidate.id}.`,
        );
      }
      qualifiers.set(candidate.qualifier, candidate);
    }
  }

  const imports = services.map((service, index) => {
    const normalized = service.file.split(path.sep).join("/");
    return `import { ${service.exportName} as Service${index} } from ${JSON.stringify(`/@fs/${normalized}`)};`;
  });
  const serviceIndex = new Map(services.map((service, index) => [service, index]));
  const runtimeTokenSymbols = new Set<ts.Symbol>();
  for (const service of services) {
    if (service.explicitToken) runtimeTokenSymbols.add(service.explicitToken);
    for (const dependency of service.dependencies) {
      if (dependency.explicitToken) runtimeTokenSymbols.add(dependency.explicitToken);
    }
  }
  const runtimeTokens = [...runtimeTokenSymbols].map((symbol) => runtimeImport(checker, symbol, root));
  const runtimeTokenNames = new Map(runtimeTokens.map((token, index) => [token.symbol, `RuntimeToken${index}`]));
  const runtimeTokenImports = runtimeTokens.map((token, index) => {
    const normalized = token.file.split(path.sep).join("/");
    return `import { ${token.exportName} as RuntimeToken${index} } from ${JSON.stringify(`/@fs/${normalized}`)};`;
  });
  // 即使 Optional 接口当前没有实现，也必须生成稳定 Token，供 tryGet() 安全查询。
  const contractCandidates = new Map(implementations);
  for (const service of services) {
    for (const dependency of service.dependencies) {
      const declaration = dependency.typeSymbol.declarations?.[0];
      if (!dependency.explicitToken && declaration && ts.isInterfaceDeclaration(declaration) && !contractCandidates.has(dependency.typeSymbol)) {
        contractCandidates.set(dependency.typeSymbol, []);
      }
    }
  }
  const hiddenContracts = [...contractCandidates.entries()].filter(([, candidates]) => candidates.every((candidate) => !candidate.explicitToken));
  const contractTokens = new Map(hiddenContracts.map(([symbol], index) => [symbol, `ContractToken${index}`]));
  const tokenDeclarations = hiddenContracts.map(([symbol], index) => {
    const declaration = symbol.declarations?.[0];
    const source = declaration?.getSourceFile().fileName ?? "unknown";
    const id = normalizedId(root, source, symbol.name);
    return `const ContractToken${index} = createContractToken(${JSON.stringify(id)});`;
  });

  const serviceToken = (service: ServiceInfo): string => {
    if (service.explicitToken) return runtimeTokenNames.get(service.explicitToken)!;
    const generatedContract = service.interfaces.find((contract) => contractTokens.has(contract));
    return generatedContract ? contractTokens.get(generatedContract)! : `Service${serviceIndex.get(service)}`;
  };

  // 在构建期完成候选选择和歧义诊断，避免容器运行后才暴露缺失或多实现错误。
  const dependencyTargets = (dependency: DependencyInfo, owner: ServiceInfo): ServiceInfo[] => {
    if (dependency.explicitToken) {
      const candidates = explicitTokenOwners.get(dependency.explicitToken) ?? [];
      if (!dependency.multiple && candidates.length > 1) {
        throw new Error(
          `[Separa] Token ${dependency.explicitToken.name} has multiple bindings, required by ${owner.id}. Use @InjectMany() or qualifier.`,
        );
      }
      return dependency.multiple ? candidates : candidates.slice(0, 1);
    }
    const direct = bySymbol.get(dependency.typeSymbol);
    if (direct) return [direct];
    const allCandidates = implementations.get(dependency.typeSymbol) ?? [];
    const declaration = dependency.typeSymbol.declarations?.[0];
    const contractId = normalizedId(root, declaration?.getSourceFile().fileName ?? "unknown", dependency.typeSymbol.name);
    const configuredQualifier = options.defaultBindings?.[contractId] ?? options.defaultBindings?.[dependency.typeSymbol.name];
    const qualifier = dependency.qualifier ?? configuredQualifier;
    const candidates = qualifier ? allCandidates.filter((candidate) => candidate.qualifier === qualifier) : allCandidates;
    if (candidates.length === 0) {
      if (dependency.optional || dependency.multiple) return [];
      const qualifierDescription = qualifier ? ` with qualifier ${JSON.stringify(qualifier)}` : "";
      throw new Error(`[Separa] Missing implementation for ${checker.getFullyQualifiedName(dependency.typeSymbol)}${qualifierDescription}, required by ${owner.id}.`);
    }
    if (!dependency.multiple && candidates.length > 1) {
      throw new Error(
        `[Separa] Multiple implementations for ${checker.getFullyQualifiedName(dependency.typeSymbol)}, required by ${owner.id}. Disambiguate with @Qualifier or defaultBindings.`,
      );
    }
    return dependency.multiple ? candidates : [candidates[0]!];
  };

  const resolveDependency = (dependency: DependencyInfo, owner: ServiceInfo): string => {
    if (dependency.explicitToken) return runtimeTokenNames.get(dependency.explicitToken)!;
    const target = dependencyTargets(dependency, owner)[0];
    if (!target) {
      const contractToken = contractTokens.get(dependency.typeSymbol);
      if (contractToken && (dependency.optional || dependency.multiple)) return contractToken;
      throw new Error(`[Separa] Cannot resolve dependency required by ${owner.id}.`);
    }
    return serviceToken(target);
  };

  // 对静态依赖图执行 DFS；visiting 节点再次出现即得到完整循环路径。
  const visitState = new Map<ServiceInfo, "visiting" | "visited">();
  const visit = (service: ServiceInfo, stack: ServiceInfo[]): void => {
    if (visitState.get(service) === "visited") return;
    if (visitState.get(service) === "visiting") {
      const start = stack.indexOf(service);
      const cycle = [...stack.slice(start), service].map((item) => item.id).join(" -> ");
      throw new Error(`[Separa] Circular service dependency detected: ${cycle}.`);
    }
    visitState.set(service, "visiting");
    stack.push(service);
    for (const dependency of service.dependencies) {
      for (const target of dependencyTargets(dependency, service)) visit(target, stack);
    }
    stack.pop();
    visitState.set(service, "visited");
  };
  for (const service of services) visit(service, []);

  // 每个定义包含静态 import、容器解析表达式以及响应式字段/方法元数据。
  const definitions = services.map((service, index) => {
    const token = serviceToken(service);
    const generatedMulti =
      service.multi ||
      service.interfaces.some((contract) => (implementations.get(contract)?.length ?? 0) > 1 && contractTokens.has(contract));
    const dependencies = service.dependencies.map((dependency) => {
      const targets = dependencyTargets(dependency, service);
      const declaration = dependency.typeSymbol.declarations?.[0];
      const contractId = normalizedId(root, declaration?.getSourceFile().fileName ?? "unknown", dependency.typeSymbol.name);
      const qualifier =
        dependency.qualifier ??
        options.defaultBindings?.[contractId] ??
        options.defaultBindings?.[dependency.typeSymbol.name] ??
        (!dependency.multiple && targets.length === 1 ? targets[0]?.qualifier : undefined);
      return { dependency, token: resolveDependency(dependency, service), qualifier };
    });
    const descriptors = dependencies.map(
      ({ dependency, token: dependencyToken, qualifier }) =>
        `{ token: ${dependencyToken}${dependency.optional ? ", optional: true" : ""}${dependency.multiple ? ", multiple: true" : ""}${qualifier ? `, qualifier: ${JSON.stringify(qualifier)}` : ""} }`,
    );
    const args = dependencies
      .map(({ dependency, token: dependencyToken, qualifier }) => {
        if (dependency.multiple) return `container.getAll(${dependencyToken})`;
        if (qualifier) {
          return dependency.optional
            ? `container.tryGetQualified(${dependencyToken}, ${JSON.stringify(qualifier)})`
            : `container.getQualified(${dependencyToken}, ${JSON.stringify(qualifier)})`;
        }
        if (dependency.optional) return `container.tryGet(${dependencyToken})`;
        return `container.get(${dependencyToken})`;
      })
      .join(", ");
    const initialize = service.methodKeys.includes("onInit") ? "\n    initialize: (instance) => instance.onInit()," : "";
    return `{\n    id: ${JSON.stringify(service.id)},\n    token: ${token},\n    implementation: Service${index},\n    scope: ${JSON.stringify(service.scope)},\n    multi: ${generatedMulti},${service.qualifier ? `\n    qualifier: ${JSON.stringify(service.qualifier)},` : ""}\n    dependencies: [${descriptors.join(", ")}],\n    stateKeys: ${JSON.stringify(service.stateKeys)},\n    methodKeys: ${JSON.stringify(service.methodKeys)},${initialize}\n    factory: (container) => enhanceService(new Service${index}(${args}), {\n      stateKeys: ${JSON.stringify(service.stateKeys)},\n      methodKeys: ${JSON.stringify(service.methodKeys)},\n    }),\n  }`;
  });

  const manifestServices = services.map((service) => ({
    id: service.id,
    source: service.file,
    scope: service.scope,
    dependencies: service.dependencies.flatMap((dependency) => dependencyTargets(dependency, service).map((target) => target.id)),
  }));
  const manifestContracts = hiddenContracts.map(([symbol, candidates]) => {
    const declaration = symbol.declarations?.[0];
    const id = normalizedId(root, declaration?.getSourceFile().fileName ?? "unknown", symbol.name);
    return { id, implementations: candidates.map((candidate) => candidate.id), multiple: candidates.length > 1 };
  });
  const generatedHandles = hiddenContracts
    .filter(([, candidates]) => candidates.length > 0)
    .map(([symbol, candidates], index) => {
      const declaration = symbol.declarations?.[0];
      const source = declaration?.getSourceFile().fileName ?? "unknown";
      const id = normalizedId(root, source, symbol.name);
      return candidates.length === 1
        ? `${JSON.stringify(symbol.name)}: createServiceHandle(${JSON.stringify(id)}, ContractToken${index}${candidates[0]!.qualifier ? `, ${JSON.stringify(candidates[0]!.qualifier)}` : ""})`
        : `${JSON.stringify(`${symbol.name}Many`)}: createServiceCollectionHandle(${JSON.stringify(id)}, ContractToken${index})`;
    });

  return [
    `import { createContractToken, createServiceCollectionHandle, createServiceHandle, enhanceService } from "@separa/core";`,
    ...imports,
    ...runtimeTokenImports,
    ...tokenDeclarations,
    `export const serviceDefinitions = [\n${definitions.join(",\n")}\n];`,
    `export const generatedServices = { ${generatedHandles.join(", ")} };`,
    `export const serviceManifest = ${JSON.stringify({ services: manifestServices, contracts: manifestContracts }, null, 2)};`,
    `export const serviceModule = { id: ${JSON.stringify(`@app/${options.profile ?? "default"}`)}, definitions: serviceDefinitions };`,
  ].join("\n");
}

function generateRegistryDeclaration(program: ts.Program, root: string, output: string, options: SeparaPluginOptions): string {
  const checker = program.getTypeChecker();
  const services = selectEntryServices(program, root, collectServices(program, root, options), options.entries);
  const implementations = new Map<ts.Symbol, ServiceInfo[]>();
  for (const service of services) {
    for (const contract of service.interfaces) {
      const candidates = implementations.get(contract) ?? [];
      candidates.push(service);
      implementations.set(contract, candidates);
    }
  }
  const handleTypes = [...implementations.entries()].map(([symbol, candidates]) => {
    const declaration = symbol.declarations?.[0];
    const source = declaration?.getSourceFile();
    const moduleSymbol = source && checker.getSymbolAtLocation(source);
    const exported = !!moduleSymbol && checker.getExportsOfModule(moduleSymbol).some((candidate) => canonicalSymbol(checker, candidate) === symbol);
    const relative = source ? normalizedPath(path.relative(path.dirname(output), source.fileName)).replace(/\.[cm]?[jt]sx?$/, "") : "";
    const specifier = relative.startsWith(".") ? relative : `./${relative}`;
    const type = exported ? `import(${JSON.stringify(specifier)}).${symbol.name}` : "unknown";
    return candidates.length === 1
      ? `    readonly ${JSON.stringify(symbol.name)}: ServiceHandle<${type}>;`
      : `    readonly ${JSON.stringify(`${symbol.name}Many`)}: ServiceCollectionHandle<${type}>;`;
  });
  return [
    `declare module "virtual:separa/registry" {`,
    `  import type { ServiceCollectionHandle, ServiceHandle } from "@separa/core";`,
    `  export interface GeneratedServices {`,
    ...handleTypes,
    `  }`,
    `}`,
  ].join("\n");
}

function findSfcDependencies(root: string, options: ts.CompilerOptions): string[] {
  const extraFiles = new Set<string>();
  const visitedFiles = new Set<string>();
  const queue: string[] = [];

  try {
    const sfcFiles = ts.sys.readDirectory(
      root,
      [".vue", ".svelte", ".astro"],
      ["node_modules", "dist", ".separa", ".git"],
    );
    for (const f of sfcFiles) {
      queue.push(path.normalize(f));
    }
  } catch {
    // ignore
  }

  const importRegex = /(?:import|export)\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (visitedFiles.has(current)) continue;
    visitedFiles.add(current);

    if (!ts.sys.fileExists(current)) continue;
    const content = ts.sys.readFile(current) ?? "";
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      const specifier = match[1] || match[2];
      if (!specifier) continue;
      const resolved = ts.resolveModuleName(specifier, current, options, ts.sys).resolvedModule?.resolvedFileName;
      if (!resolved) continue;
      const normResolved = path.normalize(resolved);
      if (normResolved.includes("/node_modules/") || normResolved.includes("\\node_modules\\")) continue;
      if (/\.[cm]?[jt]sx?$/.test(normResolved)) {
        extraFiles.add(normResolved);
      } else if (/\.(vue|svelte|astro)$/.test(normResolved)) {
        queue.push(normResolved);
      }
    }
  }

  return [...extraFiles];
}

/** 创建 Separa Vite 插件，并在构建和源码热更新时刷新生成注册表。 */
export default function separa(options: SeparaPluginOptions = {}): Plugin {
  let config: ResolvedConfig;
  let generated = "export const serviceDefinitions = []; export const generatedServices = {};";

  const rebuild = (): void => {
    const configPath = options.tsconfig
      ? path.resolve(config.root, options.tsconfig)
      : ts.findConfigFile(config.root, ts.sys.fileExists, "tsconfig.json");
    if (!configPath) throw new Error(`[Separa] Cannot find tsconfig.json below ${config.root}.`);
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
    const extraFiles = findSfcDependencies(config.root, parsed.options);
    const allFileNames = [...new Set([...parsed.fileNames, ...extraFiles])];
    // 使用完整 TypeScript Program，而不是文本匹配，才能识别接口、别名和联合类型。
    const program = ts.createProgram(allFileNames, parsed.options);
    generated = generateRegistry(program, config.root, options);
    if (options.debugOutput !== false) {
      const output = path.resolve(config.root, options.debugOutput ?? ".separa/registry.generated.ts");
      ts.sys.createDirectory(path.dirname(output));
      ts.sys.writeFile(output, generated);
    }
    if (options.declarationOutput !== false) {
      const output = path.resolve(config.root, options.declarationOutput ?? ".separa/registry.generated.d.ts");
      ts.sys.createDirectory(path.dirname(output));
      ts.sys.writeFile(output, generateRegistryDeclaration(program, config.root, output, options));
    }
  };

  return {
    name: "separa",
    enforce: "pre",
    configResolved(resolved) {
      config = resolved;
    },
    buildStart() {
      rebuild();
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : undefined;
    },
    load(id) {
      return id === RESOLVED_VIRTUAL_ID ? generated : undefined;
    },
    handleHotUpdate(context) {
      if (/\.[cm]?[jt]sx?$|\.(vue|svelte|astro)$/.test(context.file)) {
        rebuild();
        // 主动失效虚拟模块，使下一次请求获得最新服务图和 Factory。
        const module = context.server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
        if (module) context.server.moduleGraph.invalidateModule(module);
      }
    },
  };
}

export { VIRTUAL_ID };
