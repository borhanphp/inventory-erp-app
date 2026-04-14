import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Search, Tag, Package, Archive } from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { useCurrency } from '../../utils/currency';

export default function ProductListScreen({ navigation }) {
  const { formatAmount } = useCurrency();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProducts = async () => {
    try {
      const { data } = await axiosInstance.get('/products');
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchProducts();
  };

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = product.name?.toLowerCase().includes(query) || false;
    const skuMatch = product.sku?.toLowerCase().includes(query) || false;
    const catMatch = product.category?.toLowerCase().includes(query) || false;
    return nameMatch || skuMatch || catMatch;
  });

  const renderProductItem = ({ item }) => {
    const outOfStock = item.quantity <= 0;
    const lowStock = item.quantity > 0 && item.quantity <= (item.reorderLevel || 5);
    const badgeStyle = outOfStock
      ? [styles.stockBadge, styles.stockBadgeDanger]
      : lowStock
        ? [styles.stockBadge, styles.stockBadgeWarning]
        : [styles.stockBadge, styles.stockBadgeSuccess];
    const badgeTextStyle = outOfStock
      ? [styles.stockBadgeText, styles.stockBadgeTextDanger]
      : lowStock
        ? [styles.stockBadgeText, styles.stockBadgeTextWarning]
        : [styles.stockBadgeText, styles.stockBadgeTextSuccess];

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('ProductDetail', { id: item._id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.productCategory}>{item.category || 'Uncategorized'}</Text>
          </View>
          <Text style={styles.productPrice}>{formatAmount(item.price || 0)}</Text>
        </View>

        <View style={styles.metaRow}>
          {item.sku ? (
            <View style={styles.metaPill}>
              <Tag size={12} color={colors.textMuted} />
              <Text style={styles.metaPillText}>{item.sku}</Text>
            </View>
          ) : null}
          {item.category ? (
            <View style={styles.metaPill}>
              <Archive size={12} color={colors.textMuted} />
              <Text style={styles.metaPillText}>{item.category}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.qtyWrap}>
            <Package size={14} color={colors.textMuted} />
            <Text style={styles.qtyText}>
              {item.quantity} {item.unit || 'units'}
            </Text>
          </View>
          <View style={badgeStyle}>
            <Text style={badgeTextStyle}>
              {outOfStock ? 'Out of stock' : lowStock ? 'Low stock' : 'In stock'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Products</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProductCreate')} style={styles.addBtn}>
            <Plus size={18} color={colors.surface} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerCaption}>Inventory visibility, pricing, and stock health.</Text>

        <View style={styles.searchShell}>
          <Search size={18} color={colors.textSoft} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, SKU, or category"
            placeholderTextColor={colors.textSoft}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContainer}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={46} color={colors.textSoft} />
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptySubtitle}>Adjust your search or create a new product entry.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    marginTop: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  cardTitleWrap: {
    flex: 1,
  },
  productName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  productCategory: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.success,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  cardFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  stockBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stockBadgeSuccess: {
    backgroundColor: colors.successSoft,
  },
  stockBadgeWarning: {
    backgroundColor: colors.warningSoft,
  },
  stockBadgeDanger: {
    backgroundColor: colors.dangerSoft,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  stockBadgeTextSuccess: {
    color: colors.success,
  },
  stockBadgeTextWarning: {
    color: colors.warning,
  },
  stockBadgeTextDanger: {
    color: colors.danger,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 70,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  emptySubtitle: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
});
