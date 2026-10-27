'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AuditErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AuditErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 rounded-2xl bg-jet-900 border border-neon/50 text-white shadow-glow-rose max-w-4xl mx-auto">
          <div className="flex items-start space-x-4">
            <div className="h-10 w-10 rounded-xl bg-neon/20 border border-neon/50 flex items-center justify-center text-neon shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-base font-orbitron font-bold text-white tracking-wide">
                {this.props.fallbackTitle || 'Component Render Anomaly Intercepted'}
              </h3>
              <p className="text-xs font-sans text-slate-300 leading-relaxed">
                A rendering exception occurred in this audit tab, but the session data is protected in transient memory.
              </p>
              {this.state.error && (
                <pre className="p-3 bg-jet-950 border border-jet-800 rounded-lg text-[11px] font-mono text-neon overflow-x-auto max-h-32">
                  <code>{this.state.error.message}</code>
                </pre>
              )}
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleReset}
                  className="bg-jet-850 border-cerulean/50 text-cerulean hover:bg-jet-800 text-xs font-rajdhani font-bold tracking-wider"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Recover Tab View
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
