import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import axiosInstance from '../../api/axios';

export default function ProductEditScreen({ route, navigation }) {
  const { id } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Core Product Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  
  // Inventory
  const [quantity, setQuantity] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [unit, setUnit] = useState('');
  
  // Secondary Fields
  const [costPrice, setCostPrice] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data } = await axiosInstance.get(`/products/${id}`);
      if (data.success) {
        const prod = data.data;
        setName(prod.name || '');
        setCategory(prod.category || '');
        setSku(prod.sku || '');
        setPrice(prod.price !== undefined ? prod.price.toString() : '');
        setCostPrice(prod.costPrice !== undefined ? prod.costPrice.toString() : '');
        setQuantity(prod.quantity !== undefined ? prod.quantity.toString() : '0');
        setReorderLevel(prod.reorderLevel !== undefined ? prod.reorderLevel.toString() : '5');
        setUnit(prod.unit || 'piece');
        setDescription(prod.description || '');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch product details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Product Name is required.');
      return;
    }
    if (!category.trim()) {
      Alert.alert('Validation Error', 'Category is required.');
      return;
    }
    if (!price || parseFloat(price) < 0) {
      Alert.alert('Validation Error', 'Selling Price is required and must be 0 or more.');
      return;
    }
    if (quantity && parseFloat(quantity) < 0) {
      Alert.alert('Validation Error', 'Quantity cannot be negative.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        category: category.trim(),
        sku: sku.trim() || undefined,
        price: parseFloat(price) || 0,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
        quantity: parseFloat(quantity) || 0,
        reorderLevel: parseFloat(reorderLevel) || 5,
        unit: unit.trim(),
        description: description.trim()
      };

      const { data } = await axiosInstance.put(`/products/${id}`, payload);
      
      if (data.success) {
        Alert.alert('Success', 'Product updated successfully');
        navigation.goBack(); 
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon} disabled={isSubmitting}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Product</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#4f46e5" />
          ) : (
            <View style={styles.saveBtn}>
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Update</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Core Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput 
              style={styles.input} 
              value={name} 
              onChangeText={setName} 
            />
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Category *</Text>
              <TextInput 
                style={styles.input} 
                value={category} 
                onChangeText={setCategory} 
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>SKU</Text>
              <TextInput 
                style={styles.input} 
                value={sku} 
                onChangeText={setSku} 
                autoCapitalize="characters"
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              value={description} 
              onChangeText={setDescription} 
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pricing</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Selling Price ($) *</Text>
              <TextInput 
                style={styles.input} 
                value={price} 
                onChangeText={setPrice} 
                keyboardType="numeric" 
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Cost Price ($)</Text>
              <TextInput 
                style={styles.input} 
                value={costPrice} 
                onChangeText={setCostPrice} 
                keyboardType="numeric" 
              />
            </View>
          </View>
        </View>

        {/* Inventory Control */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inventory Management</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Active Stock Quantity</Text>
              <TextInput 
                style={styles.input} 
                value={quantity} 
                onChangeText={setQuantity} 
                keyboardType="numeric" 
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Unit Type</Text>
              <TextInput 
                style={styles.input} 
                value={unit} 
                onChangeText={setUnit} 
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Low Stock Alert Level</Text>
            <TextInput 
              style={styles.input} 
              value={reorderLevel} 
              onChangeText={setReorderLevel} 
              keyboardType="numeric" 
            />
          </View>
        </View>

        <View style={{height: 40}} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backIcon: { marginRight: 16 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 4 },
  scrollContent: { padding: 16, gap: 16 },
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
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#fdfdfd'
  },
  textArea: { height: 80 },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
});
