import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console (works in production too)
    console.error('🚨 APP CRASH - ErrorBoundary caught an error');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Error Message:', error?.message);
    console.error('Error Stack:', error?.stack);

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI (show in both dev and production)
      return (
        <View style={styles.container}>
          <View style={styles.errorBox}>
            <Text style={styles.title}>⚠️ App Initialization Error</Text>
            <Text style={styles.message}>
              The app encountered an error during startup.
            </Text>

            {this.state.error && (
              <ScrollView style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Error Details:</Text>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.stackText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}

            <Text style={styles.helpText}>
              Please restart the app. If the problem persists, contact support.
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorBox: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e53e3e',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 24,
  },
  detailsContainer: {
    marginTop: 20,
    maxHeight: 300,
    backgroundColor: '#f7fafc',
    borderRadius: 4,
    padding: 10,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#e53e3e',
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  stackText: {
    fontSize: 11,
    color: '#4a5568',
    fontFamily: 'monospace',
  },
  helpText: {
    marginTop: 15,
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
});

export default ErrorBoundary;
