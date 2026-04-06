import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  pending: { bg: '#fff3cd', text: '#664d03' },
  accepted: { bg: '#cff4fc', text: '#055160' },
  in_progress: { bg: '#cfe2ff', text: '#084298' },
  completed: { bg: '#d1e7dd', text: '#0f5132' },
};

const PRIORITY_COLORS = {
  low: { bg: '#e2e3e5', text: '#41464b' },
  normal: { bg: '#cfe2ff', text: '#084298' },
  high: { bg: '#fff3cd', text: '#664d03' },
  urgent: { bg: '#f8d7da', text: '#842029' },
};

export default function TasksScreen({ navigation }) {
  const { apiFetch, user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('active');

  const loadTasks = useCallback(async () => {
    try {
      const res = await apiFetch('/tasks');
      const data = await res.json();
      setTasks(data);
    } catch {
      // Will retry on next interval
    }
  }, [apiFetch]);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 10000);
    return () => clearInterval(interval);
  }, [loadTasks]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Text style={{ color: '#fff', fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={{ color: '#fff', fontSize: 20 }}>🚪</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]);

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  function renderTask({ item }) {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    const priorityStyle = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.normal;

    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
      >
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: priorityStyle.bg }]}>
            <Text style={[styles.badgeText, { color: priorityStyle.text }]}>{item.priority}</Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={styles.taskFooter}>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
          {item.shop && <Text style={styles.shopText}>📍 {item.shop}</Text>}
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        {item.items && item.items.length > 0 && (
          <Text style={styles.itemCount}>📦 {item.items.length} items</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>👋 Hello, {user?.full_name}</Text>
        <Text style={styles.shopInfo}>{user?.shop || 'No Shop'}</Text>
      </View>

      <View style={styles.filterRow}>
        {['active', 'completed', 'all'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({
                f === 'active' ? tasks.filter((t) => t.status !== 'completed').length :
                f === 'completed' ? tasks.filter((t) => t.status === 'completed').length :
                tasks.length
              })
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0d6efd']} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No tasks found</Text>
            <Text style={styles.emptyHint}>Pull down to refresh</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  greeting: {
    backgroundColor: '#0d6efd',
    padding: 16,
    paddingTop: 8,
  },
  greetingText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  shopInfo: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  filterRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
  },
  filterBtnActive: { backgroundColor: '#0d6efd' },
  filterText: { fontSize: 13, color: '#6c757d', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { padding: 12 },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitle: { fontSize: 16, fontWeight: '700', color: '#212529', flex: 1, marginRight: 8 },
  taskDesc: { fontSize: 13, color: '#6c757d', marginBottom: 8 },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  shopText: { fontSize: 12, color: '#6c757d' },
  dateText: { fontSize: 11, color: '#adb5bd', marginLeft: 'auto' },
  itemCount: { fontSize: 12, color: '#6c757d', marginTop: 8 },
  empty: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#6c757d', fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#adb5bd', marginTop: 4 },
});
