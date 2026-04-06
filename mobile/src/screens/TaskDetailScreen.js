import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const STATUS_FLOW = {
  pending: { next: 'accepted', label: '✅ Accept Task', color: '#0d6efd' },
  accepted: { next: 'in_progress', label: '▶️ Start Working', color: '#198754' },
  in_progress: { next: 'completed', label: '🏁 Mark Complete', color: '#198754' },
  completed: null,
};

const STATUS_COLORS = {
  pending: { bg: '#fff3cd', text: '#664d03' },
  accepted: { bg: '#cff4fc', text: '#055160' },
  in_progress: { bg: '#cfe2ff', text: '#084298' },
  completed: { bg: '#d1e7dd', text: '#0f5132' },
};

export default function TaskDetailScreen({ route, navigation }) {
  const { taskId } = route.params;
  const { apiFetch } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadTask();
  }, [taskId]);

  async function loadTask() {
    try {
      const res = await apiFetch(`/tasks/${taskId}`);
      const data = await res.json();
      setTask(data);
    } catch {
      Alert.alert('Error', 'Failed to load task');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus) {
    const statusAction = STATUS_FLOW[task.status];
    Alert.alert(
      'Confirm',
      `${statusAction.label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            setUpdating(true);
            try {
              const res = await apiFetch(`/tasks/${taskId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus }),
              });
              const data = await res.json();
              setTask(data);
            } catch {
              Alert.alert('Error', 'Failed to update task status');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d6efd" />
      </View>
    );
  }

  if (!task) return null;

  const statusStyle = STATUS_COLORS[task.status] || STATUS_COLORS.pending;
  const nextAction = STATUS_FLOW[task.status];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{task.title}</Text>

        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {task.status.replace('_', ' ')}
            </Text>
          </View>
          {task.shop && <Text style={styles.meta}>📍 {task.shop}</Text>}
        </View>

        {task.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{task.description}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.timeline}>
            <TimelineItem label="Created" time={task.created_at} />
            <TimelineItem label="Accepted" time={task.accepted_at} />
            <TimelineItem label="Started" time={task.started_at} />
            <TimelineItem label="Completed" time={task.completed_at} />
          </View>
        </View>

        {task.items && task.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 Items ({task.items.length})</Text>
            {task.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.item_name}</Text>
                <Text style={styles.itemQty}>×{item.quantity}</Text>
              </View>
            ))}
          </View>
        )}

        {nextAction && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: nextAction.color }, updating && { opacity: 0.6 }]}
            onPress={() => updateStatus(nextAction.next)}
            disabled={updating}
          >
            <Text style={styles.actionButtonText}>
              {updating ? 'Updating...' : nextAction.label}
            </Text>
          </TouchableOpacity>
        )}

        {task.status === 'completed' && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>✅ Task Completed</Text>
            {task.completed_at && task.created_at && (
              <Text style={styles.completedTime}>
                Completed in {getTimeDiff(task.created_at, task.completed_at)}
              </Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function TimelineItem({ label, time }) {
  return (
    <View style={styles.timelineItem}>
      <View style={[styles.timelineDot, time ? styles.timelineDotActive : null]} />
      <Text style={styles.timelineLabel}>{label}</Text>
      <Text style={styles.timelineTime}>
        {time ? new Date(time).toLocaleString() : '—'}
      </Text>
    </View>
  );
}

function getTimeDiff(start, end) {
  const diff = new Date(end) - new Date(start);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#212529', marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  badge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  meta: { fontSize: 13, color: '#6c757d' },
  section: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f0f2f5' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6c757d', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  description: { fontSize: 15, color: '#495057', lineHeight: 22 },
  timeline: { gap: 4 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#dee2e6', marginRight: 10 },
  timelineDotActive: { backgroundColor: '#198754' },
  timelineLabel: { fontSize: 14, fontWeight: '600', color: '#212529', width: 80 },
  timelineTime: { fontSize: 13, color: '#6c757d' },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  itemName: { fontSize: 15, color: '#212529' },
  itemQty: { fontSize: 14, color: '#6c757d', fontWeight: '600' },
  actionButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  completedBanner: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#d1e7dd',
    borderRadius: 10,
    alignItems: 'center',
  },
  completedText: { fontSize: 16, fontWeight: '700', color: '#0f5132' },
  completedTime: { fontSize: 13, color: '#0f5132', marginTop: 4 },
});
