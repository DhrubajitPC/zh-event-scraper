import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App.tsx";

describe("App", () => {
  it("renders the getting started heading", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /get started/i }),
    ).toBeInTheDocument();
  });

  it("increments the counter when clicked", () => {
    render(<App />);

    const counter = screen.getByRole("button", { name: /count is 0/i });
    fireEvent.click(counter);

    expect(
      screen.getByRole("button", { name: /count is 1/i }),
    ).toBeInTheDocument();
  });
});
