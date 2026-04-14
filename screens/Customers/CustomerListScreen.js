import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Search, Users } from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { colors, radii, shadows, spacing, typography } from '../../theme';

export default function CustomerListScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const skipSearchDebounce = useRef(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCustomers();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchCustomers = async () => {
    try {
      const q = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : '';
      const { data } = await axiosInstance.get(`/customers?page=1&limit=100${q}`);
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching customers', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchCustomers();
  };

  useEffect(() => {
    if (skipSearchDebounce.current) {
      skipSearchDebounce.current = false;
      return;
    }
    const t = setTimeout(() => fetchCustomers(), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const filtered = useMemo(() => customers, [customers]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() =>
        navigation.navigate('CustomerDetail', {
          id: item._id,
          name: item.name,
        })
      }
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          {item.company ? <Text style={styles.company}>{item.company}</Text> : null}
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: item.status === 'active' ? colors.successSoft : colors.surfaceStrong },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: item.status === 'active' ? colors.success : colors.textMuted },
            ]}
          >
            {(item.status || 'active').toUpperCase()}
          </Text>
        </View>
      </View>
      {item.email ? <Text style={styles.email}>{item.email}</Text> : null}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customers</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CustomerCreate')}>
            <Plus size={18} color={colors.surface} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerCaption}>Contacts, billing preferences, and account activity.</Text>
        <View style={styles.searchShell}>
          <Search size={18} color={colors.textSoft} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, phone, email, company"
            placeholderTextColor={colors.textSoft}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Users size={48} color={colors.textSoft} />
            <Text style={styles.emptyTitle}>No customers</Text>
            <Text style={styles.emptyText}>Try another search or add a new customer.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  headerCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  headerTitle: {
    flex: 1,
    ...typography.sectionTitle,
    fontSize: 22,
  },
  headerCaption: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 4,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  company: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
  },
  phone: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  email: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textSoft,
  },
  statusPill: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyContainer: { padding: 48, alignItems: 'center' },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
