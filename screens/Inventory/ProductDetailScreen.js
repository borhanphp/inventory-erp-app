import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Package, Edit, Trash2, Tag, Box, AlertTriangle, DollarSign } from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { useCurrency } from '../../utils/currency';

export default function ProductDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { formatAmount } = useCurrency();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProduct();
    });
    return unsubscribe;
  }, [navigation, id]);

  const fetchProduct = async () => {
    try {
      const { data } = await axiosInstance.get(`/products/${id}`);
      if (data.success) {
        setProduct(data.data);
      }
    } catch (error) {
      console.error('Error fetching product details', error);
      Alert.alert('Error', 'Failed to fetch product details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Product', 'Are you sure you want to delete this product? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await axiosInstance.delete(`/products/${id}`);
          navigation.goBack();
        } catch(error) {
          Alert.alert('Error', 'Failed to delete product. It may be in use in an invoice or sales order.');
        }
      }}
    ]);
  };

  if (isLoading && !product) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Product not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const outOfStock = product.quantity <= 0;
  const lowStock = product.quantity > 0 && product.quantity <= (product.reorderLevel || 5);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Action Panel */}
        <View style={styles.actionPanel}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', flex: 1 }]}
            onPress={() => navigation.navigate('ProductEdit', { id: product._id })}
          >
            <Edit size={18} color="#475569" />
            <Text style={[styles.actionText, { color: '#475569' }]}>Edit Details</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]}
            onPress={handleDelete}
          >
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Primary Product Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderFlex}>
            <View style={styles.titleWrapper}>
               <Package size={22} color="#4f46e5" />
               <Text style={styles.mainTitle}>{product.name}</Text>
            </View>
            <View style={[styles.statusBadge, product.isActive ? styles.bgGreen : styles.bgRed]}>
               <Text style={[styles.statusText, product.isActive ? styles.textGreen : styles.textRed]}>
                 {product.isActive ? 'Active' : 'Inactive'}
               </Text>
            </View>
          </View>
          
          <Text style={styles.descriptionText}>
            {product.description || 'No description provided.'}
          </Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>SKU</Text>
              <Text style={styles.infoValue}>{product.sku || '—'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>{product.category || '—'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.gridContainer}>
          {/* Inventory Card */}
          <View style={[styles.card, styles.gridCard]}>
             <View style={styles.cardHeaderFlex}>
                <Box size={18} color="#64748b" />
                <Text style={styles.cardTitle}>Inventory</Text>
             </View>
             
             <View style={styles.qtyBigContainer}>
                <Text style={styles.qtyBigText}>{product.quantity}</Text>
                <Text style={styles.qtyUnitText}>{product.unit || 'units'}</Text>
             </View>

             <View style={styles.divider} />

             <View style={styles.metricsRow}>
                <Text style={styles.label}>Available:</Text>
                <Text style={styles.value}>{product.availableQuantity ?? product.quantity}</Text>
             </View>
             <View style={styles.metricsRow}>
                <Text style={styles.label}>Reorder Lvl:</Text>
                <Text style={styles.value}>{product.reorderLevel || 5}</Text>
             </View>

             {(outOfStock || lowStock) && (
               <View style={[styles.alertBox, outOfStock ? styles.alertBoxRed : styles.alertBoxOrange]}>
                  <AlertTriangle size={14} color={outOfStock ? '#ef4444' : '#f59e0b'} />
                  <Text style={[styles.alertText, outOfStock ? {color: '#b91c1c'} : {color: '#b45309'}]}>
                    {outOfStock ? 'Stock Depleted' : 'Stock gets low'}
                  </Text>
               </View>
             )}
          </View>

          {/* Pricing Card */}
          <View style={[styles.card, styles.gridCard]}>
             <View style={styles.cardHeaderFlex}>
                <DollarSign size={18} color="#64748b" />
                <Text style={styles.cardTitle}>Pricing</Text>
             </View>

             <View style={styles.metricsRow}>
                <Text style={styles.label}>Sale Price:</Text>
                <Text style={styles.bigPriceValue}>{formatAmount(product.price || 0)}</Text>
             </View>

             <View style={styles.divider} />

             <View style={styles.metricsRow}>
                <Text style={styles.label}>Unit Cost:</Text>
                <Text style={styles.value}>{formatAmount(product.costPrice || 0)}</Text>
             </View>
             
             {product.costPrice > 0 && product.price > 0 && (
               <View style={styles.marginBox}>
                 <Text style={styles.marginText}>
                   Margin: {(((product.price - product.costPrice) / product.price) * 100).toFixed(1)}%
                 </Text>
               </View>
             )}
          </View>
        </View>

        {/* Configurations */}
        <View style={styles.card}>
           <Text style={styles.cardTitle}>Settings Overview</Text>
           <View style={styles.settingsGrid}>
              <View style={styles.settingItem}>
                 <Text style={styles.label}>Barcode / EAN</Text>
                 <Text style={styles.value}>{product.barcode || '—'}</Text>
              </View>
              <View style={styles.settingItem}>
                 <Text style={styles.label}>Brand</Text>
                 <Text style={styles.value}>{product.brand || '—'}</Text>
              </View>
              <View style={styles.settingItem}>
                 <Text style={styles.label}>Tax Rate</Text>
                 <Text style={styles.value}>{product.tax?.rate ? product.tax.rate + '%' : 'Exempt'}</Text>
              </View>
              <View style={styles.settingItem}>
                 <Text style={styles.label}>Tracking</Text>
                 <Text style={[styles.value, {textTransform: 'capitalize'}]}>{product.trackingType || 'None'}</Text>
              </View>
           </View>
        </View>

        <View style={{height: 40}} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backIcon: { width: 40 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' },
  headerRight: { width: 40 },
  scrollContent: { padding: 16, gap: 16 },
  
  actionPanel: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6
  },
  actionText: { fontWeight: '600', fontSize: 14 },
  
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeaderFlex: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  mainTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', flex: 1 },
  descriptionText: { fontSize: 14, color: '#64748b', lineHeight: 20, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '500', color: '#334155' },
  
  gridContainer: { flexDirection: 'row', gap: 16 },
  gridCard: { flex: 1, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  
  qtyBigContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 8 },
  qtyBigText: { fontSize: 32, fontWeight: '800', color: '#0f172a' },
  qtyUnitText: { fontSize: 14, fontWeight: '500', color: '#64748b' },
  
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  label: { fontSize: 13, color: '#64748b' },
  value: { fontSize: 14, fontWeight: '600', color: '#334155' },
  bigPriceValue: { fontSize: 18, fontWeight: 'bold', color: '#10b981' },
  
  marginBox: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', marginTop: 8 },
  marginText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  
  alertBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 8, borderRadius: 6 },
  alertBoxRed: { backgroundColor: '#fef2f2' },
  alertBoxOrange: { backgroundColor: '#fffbeb' },
  alertText: { fontSize: 12, fontWeight: '600' },

  settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, rowGap: 16 },
  settingItem: { width: '50%' },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  bgGreen: { backgroundColor: '#dcfce7' },
  textGreen: { color: '#15803d' },
  bgRed: { backgroundColor: '#fee2e2' },
  textRed: { color: '#b91c1c' },

  errorText: { fontSize: 16, color: '#ef4444', marginBottom: 16 },
  backButton: { backgroundColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  backButtonText: { fontWeight: '600', color: '#334155' }
});
