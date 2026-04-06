import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setLocalServerUrl] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, serverUrl: currentUrl, updateServerUrl } = useAuth();

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password.trim());
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Could not connect to server. Check your network connection and server URL.');
    } finally {
      setLoading(false);
    }
  }

  async function saveServerUrl() {
    if (serverUrl.trim()) {
      await updateServerUrl(serverUrl.trim());
      Alert.alert('Saved', 'Server URL updated');
      setShowServerConfig(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.logo}>💊</Text>
          <Text style={styles.title}>Prabhat Medical</Text>
          <Text style={styles.subtitle}>Worker App</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing in...' : '🔐 Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serverLink}
            onPress={() => {
              setLocalServerUrl(currentUrl);
              setShowServerConfig(!showServerConfig);
            }}
          >
            <Text style={styles.serverLinkText}>⚙️ Server Settings</Text>
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverConfig}>
              <Text style={styles.label}>Server URL</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setLocalServerUrl}
                placeholder="http://192.168.1.100:3000"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity style={styles.saveButton} onPress={saveServerUrl}>
                <Text style={styles.saveButtonText}>Save URL</Text>
              </TouchableOpacity>
              <Text style={styles.hint}>
                Current: {currentUrl}
              </Text>
            </View>
          )}

          <Text style={styles.footer}>Local Network Access Only</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d6efd',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  logo: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0d6efd',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6c757d',
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#0d6efd',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  serverLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  serverLinkText: {
    color: '#6c757d',
    fontSize: 13,
  },
  serverConfig: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: '#198754',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  hint: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 11,
    color: '#adb5bd',
  },
});
