'use client';

import { type ReactNode, Component, type ErrorInfo } from 'react';

type Props = {
  readonly title: string;
  readonly children: ReactNode;
};

type State = { hasError: boolean; message: string | null };

export class AdminWidget extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Admin widget failed', error, info);
  }

  render() {
    return (
      <section className="rounded-lg border border-border bg-background p-4">
        <h3 className="mb-3 text-sm font-medium">{this.props.title}</h3>
        {this.state.hasError ? (
          <p className="text-sm text-destructive">
            Widget unavailable{this.state.message ? `: ${this.state.message}` : '.'}
          </p>
        ) : (
          this.props.children
        )}
      </section>
    );
  }
}
