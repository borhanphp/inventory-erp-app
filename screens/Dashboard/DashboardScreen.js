import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ClipboardCheck,
  FileCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Users,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, radii, shadows, spacing, typography } from '../../theme';

const MODULES = [
  {
    id: 'quotations',
    title: 'Quotations',
    description: 'Draft, revise, and share estimates.',
    icon: FileText,
    route: 'QuotationList',
    color: colors.primary,
    active: true,
  },
  {
    id: 'invoices',
    title: 'Invoices',
    description: 'Track billing status and balances.',
    icon: FileCheck,
    route: 'InvoiceList',
    color: colors.success,
    active: true,
  },
  {
    id: 'products',
    title: 'Products',
    description: 'Review stock, pricing, and catalog data.',
    icon: Package,
    route: 'ProductList',
    color: '#7a56f5',
    active: true,
  },
  {
    id: 'deliveries',
    title: 'Delivery Notes',
    description: 'Manage dispatches and shipment status updates.',
    icon: ClipboardCheck,
    route: 'DeliveryList',
    color: '#0f7b72',
    active: true,
  },
  {
    id: 'orders',
    title: 'Sales Orders',
    description: 'Create orders, confirm, and generate invoices.',
    icon: ShoppingCart,
    route: 'OrderList',
    color: colors.warning,
    active: true,
  },
  {
    id: 'customers',
    title: 'Customers',
    description: 'Add and edit contacts, open AR ledger.',
    icon: Users,
    route: 'CustomerList',
    color: '#d14d72',
    active: true,
  },
];

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();

  const columnGap = spacing.md;
  const cardWidth = (width - spacing.lg * 2 - columnGap) / 2;

  const handlePress = (module) => {
    if (module.active) {
      navigation.navigate(module.route);
      return;
    }

    Alert.alert('Coming soon', `${module.title} is planned for a later mobile release.`);
  };

  const confirmLogout = () => {
    Alert.alert('Sign out', 'End the current mobile ERP session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', onPress: logout, style: 'destructive' },
    ]);
  };

  const activeCount = MODULES.filter((module) => module.active).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <LayoutDashboard size={16} color={colors.primary} />
              <Text style={styles.heroBadgeText}>Operations overview</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
              <LogOut size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>

          <Text style={styles.greeting}>Welcome back, {user?.name || user?.fname || 'User'}</Text>
         

         
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workspace Modules</Text>
          <Text style={styles.sectionCaption}>Tap a module to continue.</Text>
        </View>

        <View style={styles.grid}>
          {MODULES.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={[
                styles.moduleCard,
                { width: cardWidth },
                !module.active && styles.moduleCardInactive,
              ]}
              onPress={() => handlePress(module)}
              activeOpacity={0.88}
            >
              <View style={[styles.moduleIconWrap, { backgroundColor: `${module.color}16` }]}>
                <module.icon size={24} color={module.color} strokeWidth={2.1} />
              </View>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleDescription}>{module.description}</Text>
              <View
                style={[
                  styles.statusPill,
                  module.active ? styles.statusPillActive : styles.statusPillPlanned,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    module.active ? styles.statusPillTextActive : styles.statusPillTextPlanned,
                  ]}
                >
                  {module.active ? 'Available' : 'Planned'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSoft,
  },
  greeting: {
    ...typography.title,
    fontSize: 30,
    marginBottom: spacing.sm,
  },
  heroCopy: {
    ...typography.subtitle,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
  },
  sectionCaption: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  moduleCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 188,
    ...shadows.card,
  },
  moduleCardInactive: {
    opacity: 0.88,
  },
  moduleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  moduleDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 'auto',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillActive: {
    backgroundColor: colors.successSoft,
  },
  statusPillPlanned: {
    backgroundColor: colors.surfaceStrong,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusPillTextActive: {
    color: colors.success,
  },
  statusPillTextPlanned: {
    color: colors.textMuted,
  },
});
