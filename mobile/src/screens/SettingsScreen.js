import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen() {
  const { user, serverUrl, updateServerUrl, logout } = useAuth();
  const [url, setUrl] = useState(serverUrl);

  async function saveUrl() {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }
    await updateServerUrl(url.trim());
    Alert.alert('Success', 'Server URL updated. Please re-login for changes to take effect.');
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>👤 Account</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.full_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{user?.username}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{user?.role}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Shop</Text>
          <Text style={styles.value}>{user?.shop || 'Not assigned'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🌐 Server Connection</Text>
        <Text style={styles.hint}>
          Enter the IP address and port of the Prabhat Medical server on your local network.
        </Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="http://192.168.1.100:3000"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <TouchableOpacity style={styles.saveBtn} onPress={saveUrl}>
          <Text style={styles.saveBtnText}>Save Server URL</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ℹ️ About</Text>
        <Text style={styles.aboutText}>Prabhat Medical Worker App</Text>
        <Text style={styles.aboutVersion}>Version 1.0.0</Text>
        <Text style={styles.aboutText}>Local Network Shop Management</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutBtnText}>🚪 Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  label: { fontSize: 14, color: '#6c757d' },
  value: { fontSize: 14, fontWeight: '600', color: '#212529' },
  hint: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 12,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  saveBtn: {
    backgroundColor: '#198754',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  aboutText: { fontSize: 14, color: '#6c757d', marginBottom: 4 },
  aboutVersion: { fontSize: 13, color: '#adb5bd', marginBottom: 4 },
  logoutBtn: {
    backgroundColor: '#dc3545',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
