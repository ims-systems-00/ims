import { Component, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Rendered instead of `children` when a descendant throws / a lazy chunk fails to load. */
  fallback: ReactNode;
  /** Change this (e.g. dialog open / record id) to retry rendering after an error. */
  resetKey?: unknown;
};

type ErrorBoundaryState = { hasError: boolean };

/**
 * Minimal error boundary. Without one, a rejected lazy `import()`
 * (e.g. a heavy optional dependency failing to load) unmounts the
 * entire React tree and leaves a blank screen.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
