import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { SeparaProvider, useContainer, useService, useServiceState } from "@separa/react";
import { createContainer } from "@separa/ioc-inversify";
import {
  Service,
  defineDecoratedService,
  createContractToken,
  createServiceHandle,
} from "@separa/core";

describe("@separa/react", () => {
  it("throws error when useContainer is called outside SeparaProvider", () => {
    function BadComponent() {
      useContainer();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<BadComponent />)).toThrow(
      "useService() must be used inside <SeparaProvider>.",
    );
    spy.mockRestore();
  });

  it("provides container via useContainer inside SeparaProvider", () => {
    const container = createContainer();
    let retrievedContainer: any;
    function Comp() {
      retrievedContainer = useContainer();
      return <div>ok</div>;
    }

    render(
      <SeparaProvider container={container}>
        <Comp />
      </SeparaProvider>,
    );

    expect(retrievedContainer).toBe(container);
  });

  it("subscribes and updates component when service state changes via useService", () => {
    @Service({ scope: "singleton" })
    class CounterService {
      count = 0;
      step = 1;

      inc() {
        this.count += this.step;
      }
      setStep(s: number) {
        this.step = s;
      }
    }

    const container = createContainer({
      definitions: [defineDecoratedService(CounterService, ["count", "step"])],
    });

    let renderCount = 0;
    function CounterComponent() {
      renderCount++;
      const counter = useService(CounterService);
      return (
        <div>
          <span data-testid="count">{counter.count}</span>
          <button data-testid="inc-btn" onClick={() => counter.inc()}>
            Increment
          </button>
        </div>
      );
    }

    render(
      <SeparaProvider container={container}>
        <CounterComponent />
      </SeparaProvider>,
    );

    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(renderCount).toBe(1);

    act(() => {
      fireEvent.click(screen.getByTestId("inc-btn"));
    });

    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(renderCount).toBe(2);
  });

  it("extracts slice of state with useServiceState", () => {
    @Service({ scope: "singleton" })
    class UserProfileService {
      name = "Alice";
      score = 100;

      updateScore(s: number) {
        this.score = s;
      }
      updateName(n: string) {
        this.name = n;
      }
    }

    const container = createContainer({
      definitions: [defineDecoratedService(UserProfileService, ["name", "score"])],
    });

    function NameComponent() {
      const name = useServiceState(UserProfileService, (s) => s.name);
      return <span data-testid="name-display">{name}</span>;
    }

    render(
      <SeparaProvider container={container}>
        <NameComponent />
      </SeparaProvider>,
    );

    expect(screen.getByTestId("name-display").textContent).toBe("Alice");

    const service = container.get(UserProfileService);
    act(() => {
      service.updateName("Bob");
    });

    expect(screen.getByTestId("name-display").textContent).toBe("Bob");
  });

  it("resolves and subscribes via ServiceHandle", () => {
    interface ITheme {
      mode: string;
      toggle(): void;
    }
    const ThemeToken = createContractToken<ITheme>("ITheme");

    @Service({ scope: "singleton", token: ThemeToken })
    class ThemeService implements ITheme {
      mode = "light";
      toggle() {
        this.mode = this.mode === "light" ? "dark" : "light";
      }
    }

    const ThemeHandle = createServiceHandle("theme", ThemeToken);

    const container = createContainer({
      definitions: [defineDecoratedService(ThemeService, ["mode"])],
    });

    function ThemeView() {
      const theme = useService(ThemeHandle);
      return (
        <div>
          <span data-testid="theme-mode">{theme.mode}</span>
          <button data-testid="theme-toggle" onClick={() => theme.toggle()}>
            Toggle
          </button>
        </div>
      );
    }

    render(
      <SeparaProvider container={container}>
        <ThemeView />
      </SeparaProvider>,
    );

    expect(screen.getByTestId("theme-mode").textContent).toBe("light");

    act(() => {
      fireEvent.click(screen.getByTestId("theme-toggle"));
    });

    expect(screen.getByTestId("theme-mode").textContent).toBe("dark");
  });

  it("resolves non-reactive services without error", () => {
    class PlainService {
      msg = "plain";
    }

    const container = createContainer({
      definitions: [
        {
          id: "plain",
          token: PlainService,
          implementation: PlainService,
          scope: "singleton",
          multi: false,
          dependencies: [],
          stateKeys: [],
          methodKeys: [],
          factory: () => new PlainService(),
        },
      ],
    });

    function PlainView() {
      const plain = useService(PlainService);
      return <div data-testid="plain-val">{plain.msg}</div>;
    }

    render(
      <SeparaProvider container={container}>
        <PlainView />
      </SeparaProvider>,
    );

    expect(screen.getByTestId("plain-val").textContent).toBe("plain");
  });
});
