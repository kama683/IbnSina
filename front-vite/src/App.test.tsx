import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("рендерится", () => {
    render(<App />);
    expect(screen.getByText(/IbnSina/)).toBeInTheDocument();
  });
});
