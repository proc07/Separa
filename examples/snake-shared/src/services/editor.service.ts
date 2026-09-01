import { Service } from "@separa/core";
import { DEFAULT_EDITOR_CODE } from "../custom-alghorithm";

@Service({ scope: "singleton" })
export class EditorService {
  code: string = DEFAULT_EDITOR_CODE;
  theme = "xcode";
  isOpen = false;

  changeCode(newCode: string): void {
    this.code = newCode;
  }

  changeTheme(newTheme: string): void {
    this.theme = newTheme;
  }

  open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  toggle(openState?: boolean): void {
    this.isOpen = openState !== undefined ? openState : !this.isOpen;
  }
}
