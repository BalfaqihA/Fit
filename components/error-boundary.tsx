import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { captureException } from '@/lib/observability';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Catches uncaught render errors anywhere below it. Without this, a thrown
 * error renders the JS-bundle white screen on RN — a recoverable screen with
 * a "Reload" button is much better UX and gives the user a clear next step.
 *
 * The error is also forwarded to Sentry so we learn about crashes that users
 * rarely report.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    captureException(error, {
      tags: { area: 'render' },
      context: { componentStack: info.componentStack ?? '' },
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong.</Text>
        <Text style={styles.message}>
          The app hit an unexpected error. Tap reload to try again — your data
          is safe.
        </Text>
        <Pressable style={styles.button} onPress={this.reset}>
          <Text style={styles.buttonText}>Reload</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0E0F12',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6C56D9',
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
