import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Plus, Trash2, CheckCircle,
  ChevronDown, ChevronUp,
  User, FileText, List,
  Search, X, Check, UserPlus, Users,
} from 'lucide-react-native';
import axiosInstance from '../../api/axios';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';

// ── Accordion Section ──────────────────────────────────────────────────────
function AccordionSection({ title, icon: Icon, isOpen, onToggle, children, badge }) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.accordionHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.accordionLeft}>
          {Icon && (
            <View style={styles.accordionIconWrap}>
              <Icon size={16} color="#4f46e5" />
            </View>
          )}
          <Text style={styles.accordionTitle}>{title}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText} numberOfLines={1}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {isOpen ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />}
      </TouchableOpacity>
      {isOpen && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
}

// ── Customer Picker Modal ─────────────────────────────────────────────────
function CustomerPickerModal({ visible, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);

  const fetchCustomers = useCallback(async (search = '') => {
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.get('/customers', {
        params: { search, limit: 30, status: 'active' },
      });
      setCustomers(data?.data || []);
    } catch {
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setQuery('');
      fetchCustomers('');
    }
  }, [visible]);

  const onQueryChange = (text) => {
    setQuery(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCustomers(text), 350);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.customerRow} onPress={() => { onSelect(item); onClose(); }} activeOpacity={0.7}>
      <View style={styles.customerAvatar}>
        <Text style={styles.customerAvatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={styles.customerRowInfo}>
        <Text style={styles.customerRowName}>{item.name}</Text>
        <Text style={styles.customerRowSub} numberOfLines={1}>
          {[item.company, item.phone, item.email].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Check size={16} color="#4f46e5" />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Customer</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <X size={22} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone, email..."
            value={query}
            onChangeText={onQueryChange}
            autoFocus
            placeholderTextColor="#94a3b8"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); fetchCustomers(''); }}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {isLoading ? (
          <View style={styles.modalCenter}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.loadingText}>Searching customers...</Text>
          </View>
        ) : customers.length === 0 ? (
          <View style={styles.modalCenter}>
            <Users size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No customers found</Text>
            <Text style={styles.emptySubText}>Try a different search term</Text>
          </View>
        ) : (
          <FlatList
            data={customers}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function InvoiceCreateScreen({ navigation }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitGuard = useRef(false);

  // Accordion open state
  const [openBillTo, setOpenBillTo] = useState(true);
  const [openDetails, setOpenDetails] = useState(true);
  const [openItems, setOpenItems] = useState(true);

  // Customer mode: 'existing' | 'custom'
  const [customerMode, setCustomerMode] = useState('custom');
  const [showPicker, setShowPicker] = useState(false);

  // Selected DB customer
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Custom customer fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [customerStreet, setCustomerStreet] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerZip, setCustomerZip] = useState('');
  const [customerCountry, setCustomerCountry] = useState('');

  // Invoice number
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isLoadingNumber, setIsLoadingNumber] = useState(true);
  const [orgCurrency, setOrgCurrency] = useState('USD'); // will be overwritten on mount

  const [dueDays, setDueDays] = useState('30');

  // Line Items
  const [items, setItems] = useState([
    { description: '', quantity: '1', unit: '', unitPrice: '0', taxRate: '0', discount: '0' },
  ]);

  // Fetch invoice number preview AND org currency on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosInstance.get('/custom-invoicing/settings');
        const cfg = data?.data?.invoiceNumbering;
        // Pick up org currency from invoice settings
        const defaultCurrency = data?.data?.defaultCurrency;
        if (defaultCurrency) setOrgCurrency(defaultCurrency);
        if (cfg) {
          const year = new Date().getFullYear();
          const num = String(cfg.nextNumber || 1).padStart(cfg.padding || 4, '0');
          const preview = (cfg.format || 'INV-{YYYY}-{####}')
            .replace(/{YYYY}/g, year)
            .replace(/{YY}/g, String(year).slice(-2))
            .replace(/{MM}/g, String(new Date().getMonth() + 1).padStart(2, '0'))
            .replace(/{DD}/g, String(new Date().getDate()).padStart(2, '0'))
            .replace(/{PREFIX}/g, cfg.prefix || '')
            .replace(/{SUFFIX}/g, cfg.suffix || '')
            .replace(/{#{1,}}/g, num)
            .replace(/{NUMBER}/g, num);
          setInvoiceNumber(preview);
        }
      } catch (_) {
        /* leave blank, backend will auto-generate */
      } finally {
        setIsLoadingNumber(false);
      }
      // Also fetch org settings.currency as a cross-check
      try {
        const { data: orgData } = await axiosInstance.get('/profile/organization');
        if (orgData?.success) {
          const c = orgData.data?.settings?.currency; // /profile/organization returns org directly at data.data
          if (c) setOrgCurrency(c);
        }
      } catch (_) { /* use whatever we already have */ }
    })();
  }, []);

  // When a DB customer is selected → fill custom fields as well (for display)
  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);
    setCustomerName(c.name || '');
    setCustomerPhone(c.phone || '');
    setCustomerEmail(c.email || '');
    setCustomerTaxId(c.taxNumber || '');
    setCustomerStreet(c.address?.street || '');
    setCustomerCity(c.address?.city || '');
    setCustomerState(c.address?.state || '');
    setCustomerZip(c.address?.postalCode || '');
    setCustomerCountry(c.address?.country || '');
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerTaxId('');
    setCustomerStreet('');
    setCustomerCity('');
    setCustomerState('');
    setCustomerZip('');
    setCustomerCountry('');
  };

  const switchMode = (mode) => {
    setCustomerMode(mode);
    clearSelectedCustomer();
  };

  // Line item helpers
  const handleAddItem = () =>
    setItems([...items, { description: '', quantity: '1', unit: '', unitPrice: '0', taxRate: '0', discount: '0' }]);

  const handleRemoveItem = (index) => setItems(items.filter((_, i) => i !== index));

  const handleChangeItem = (index, field, value) => {
    const next = [...items];
    next[index][field] = value;
    setItems(next);
  };

  const calculateTotals = () => {
    let subtotal = 0, totalDiscount = 0, taxAmount = 0;
    items.forEach(item => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.unitPrice) || 0;
      const t = parseFloat(item.taxRate) || 0;
      const d = parseFloat(item.discount) || 0;
      const gross = q * p;
      const discounted = Math.max(0, gross - d);
      subtotal += gross;
      totalDiscount += d;
      taxAmount += (discounted * t) / 100;
    });
    const totalAmount = subtotal - totalDiscount + taxAmount;
    return { subtotal, totalDiscount, taxAmount, totalAmount };
  };

  // Derived display label for accordion badge
  const customerBadgeLabel =
    customerMode === 'existing' && selectedCustomer
      ? selectedCustomer.name
      : customerMode === 'custom' && customerName
      ? customerName
      : null;

  const handleSubmit = async () => {
    // Validation
    if (customerMode === 'existing' && !selectedCustomer) {
      Alert.alert('Validation Error', 'Please select a customer or switch to Custom Customer.');
      return;
    }
    if (customerMode === 'custom' && !customerName.trim()) {
      Alert.alert('Validation Error', 'Customer Name is required.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Validation Error', 'At least one line item is required.');
      return;
    }
    const invalidItem = items.find(
      i => !i.description.trim() || parseFloat(i.quantity) <= 0 || parseFloat(i.unitPrice) < 0
    );
    if (invalidItem) {
      Alert.alert('Validation Error', 'All items must have a Description, Qty > 0, and Price ≥ 0.');
      return;
    }

    if (submitGuard.current) return;
    submitGuard.current = true;
    setIsSubmitting(true);

    try {
      const formattedItems = items.map(i => {
        const qty = parseFloat(i.quantity) || 0;
        const price = parseFloat(i.unitPrice) || 0;
        const tax = parseFloat(i.taxRate) || 0;
        const disc = parseFloat(i.discount) || 0;
        const gross = qty * price;
        const discounted = Math.max(0, gross - disc);
        const itemTax = (discounted * tax) / 100;
        return {
          description: i.description,
          quantity: qty,
          unit: i.unit,
          unitPrice: price,
          taxRate: tax,
          discount: disc,
          taxAmount: itemTax,
          totalAmount: discounted + itemTax,
        };
      });

      const totals = calculateTotals();
      const vDate = new Date();
      vDate.setDate(vDate.getDate() + (parseInt(dueDays) || 30));

      const payload = {
        ...(invoiceNumber.trim() ? { invoiceNumber: invoiceNumber.trim() } : {}),
        currency: { code: orgCurrency, symbol: getCurrencySymbol(orgCurrency).trim(), exchangeRate: 1 },
        dueDate: vDate.toISOString(),
        lineItems: formattedItems,
        subtotal: totals.subtotal,
        totalDiscount: totals.totalDiscount,
        totalTax: totals.taxAmount,
        totalAmount: totals.totalAmount,
        status: 'draft',
        ...(customerMode === 'existing' && selectedCustomer
          ? {
              isCustomCustomer: false,
              customer: selectedCustomer._id,
            }
          : {
              isCustomCustomer: true,
              customCustomer: {
                name: customerName,
                phone: customerPhone,
                email: customerEmail,
                taxId: customerTaxId,
                address: {
                  street: customerStreet,
                  city: customerCity,
                  state: customerState,
                  zipCode: customerZip,
                  country: customerCountry,
                },
              },
            }),
      };

      const { data } = await axiosInstance.post('/custom-invoicing/invoices', payload);
      if (data.success) {
        Alert.alert('Success', 'Invoice generated successfully');
        navigation.goBack();
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
      submitGuard.current = false;
    }
  };

  const { subtotal, totalDiscount, taxAmount, totalAmount } = calculateTotals();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon} disabled={isSubmitting}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Invoice</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? <ActivityIndicator color="#4f46e5" />
            : (
              <View style={styles.saveBtn}>
                <CheckCircle size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save</Text>
              </View>
            )}
        </TouchableOpacity>
      </View>

      {/* Customer Picker Modal */}
      <CustomerPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleSelectCustomer}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* ── SECTION 1: Invoice To ── */}
        <AccordionSection
          title="Invoice To"
          icon={User}
          isOpen={openBillTo}
          onToggle={() => setOpenBillTo(v => !v)}
          badge={customerBadgeLabel}
        >
          {/* Mode Toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, customerMode === 'existing' && styles.modeBtnActive]}
              onPress={() => switchMode('existing')}
            >
              <Users size={14} color={customerMode === 'existing' ? '#4f46e5' : '#94a3b8'} />
              <Text style={[styles.modeBtnText, customerMode === 'existing' && styles.modeBtnTextActive]}>
                Existing Customer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, customerMode === 'custom' && styles.modeBtnActive]}
              onPress={() => switchMode('custom')}
            >
              <UserPlus size={14} color={customerMode === 'custom' ? '#4f46e5' : '#94a3b8'} />
              <Text style={[styles.modeBtnText, customerMode === 'custom' && styles.modeBtnTextActive]}>
                Custom / Walk-in
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Existing Customer mode ── */}
          {customerMode === 'existing' && (
            <>
              {selectedCustomer ? (
                <View style={styles.selectedCustomerCard}>
                  <View style={styles.selectedAvatarWrap}>
                    <Text style={styles.selectedAvatarText}>
                      {selectedCustomer.name?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedName}>{selectedCustomer.name}</Text>
                    {selectedCustomer.company ? (
                      <Text style={styles.selectedSub}>{selectedCustomer.company}</Text>
                    ) : null}
                    {selectedCustomer.phone ? (
                      <Text style={styles.selectedSub}>{selectedCustomer.phone}</Text>
                    ) : null}
                    {selectedCustomer.email ? (
                      <Text style={styles.selectedSub}>{selectedCustomer.email}</Text>
                    ) : null}
                    {selectedCustomer.taxNumber ? (
                      <Text style={styles.selectedSub}>TRN: {selectedCustomer.taxNumber}</Text>
                    ) : null}
                    {selectedCustomer.address?.street ? (
                      <Text style={styles.selectedSub} numberOfLines={1}>
                        {[selectedCustomer.address.street, selectedCustomer.address.city, selectedCustomer.address.country]
                          .filter(Boolean).join(', ')}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={clearSelectedCustomer} style={styles.clearBtn}>
                    <X size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.pickBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
                  <Search size={18} color="#4f46e5" />
                  <Text style={styles.pickBtnText}>Search & select a customer</Text>
                  <ChevronDown size={18} color="#4f46e5" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.changeLinkRow}
                onPress={() => setShowPicker(true)}
              >
                {selectedCustomer && (
                  <Text style={styles.changeLink}>Change customer</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ── Custom / Walk-in mode ── */}
          {customerMode === 'custom' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Customer Name *</Text>
                <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="e.g. John Doe" />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Phone</Text>
                  <TextInput style={styles.input} value={customerPhone} onChangeText={setCustomerPhone} placeholder="+1 234 567" keyboardType="phone-pad" />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput style={styles.input} value={customerEmail} onChangeText={setCustomerEmail} placeholder="john@example.com" keyboardType="email-address" autoCapitalize="none" />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tax ID / TRN / VAT No.</Text>
                <TextInput style={styles.input} value={customerTaxId} onChangeText={setCustomerTaxId} placeholder="e.g. 100234567890003" autoCapitalize="characters" />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Street Address</Text>
                <TextInput style={styles.input} value={customerStreet} onChangeText={setCustomerStreet} placeholder="e.g. 123 Main St" />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>City</Text>
                  <TextInput style={styles.input} value={customerCity} onChangeText={setCustomerCity} placeholder="Dubai" />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>State / Region</Text>
                  <TextInput style={styles.input} value={customerState} onChangeText={setCustomerState} placeholder="UAE" />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>ZIP / Postal Code</Text>
                  <TextInput style={styles.input} value={customerZip} onChangeText={setCustomerZip} placeholder="00000" keyboardType="numeric" />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Country</Text>
                  <TextInput style={styles.input} value={customerCountry} onChangeText={setCustomerCountry} placeholder="United Arab Emirates" />
                </View>
              </View>
            </>
          )}
        </AccordionSection>

        {/* ── SECTION 2: Invoice Details ── */}
        <AccordionSection
          title="Invoice Details"
          icon={FileText}
          isOpen={openDetails}
          onToggle={() => setOpenDetails(v => !v)}
          badge={invoiceNumber || null}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Invoice Number</Text>
            <View style={styles.invoiceNumRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                placeholder={isLoadingNumber ? 'Loading...' : 'e.g. INV-2026-0001'}
                autoCapitalize="characters"
                editable={!isLoadingNumber}
              />
              {isLoadingNumber && (
                <ActivityIndicator size="small" color="#4f46e5" style={{ marginLeft: 8 }} />
              )}
            </View>
            <Text style={styles.hintText}>Leave blank to auto-generate</Text>
          </View>

          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <Text style={styles.label}>Due In (Days)</Text>
            <TextInput style={styles.input} value={dueDays} onChangeText={setDueDays} keyboardType="numeric" />
          </View>
        </AccordionSection>

        {/* ── SECTION 3: Line Items ── */}
        <AccordionSection
          title="Line Items"
          icon={List}
          isOpen={openItems}
          onToggle={() => setOpenItems(v => !v)}
          badge={`${items.length} item${items.length !== 1 ? 's' : ''}`}
        >
          <View style={styles.addBtnRow}>
            <TouchableOpacity onPress={handleAddItem} style={styles.addBtn}>
              <Plus size={16} color="#4f46e5" />
              <Text style={styles.addBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemBox}>
              <View style={styles.itemBoxHeader}>
                <Text style={styles.itemBoxTitle}>Item {index + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveItem(index)} style={styles.removeBtn}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput style={styles.input} value={item.description} onChangeText={val => handleChangeItem(index, 'description', val)} placeholder="e.g. Consulting Services" />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Qty *</Text>
                  <TextInput style={styles.input} value={item.quantity} onChangeText={val => handleChangeItem(index, 'quantity', val)} keyboardType="numeric" />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Unit</Text>
                  <TextInput style={styles.input} value={item.unit} onChangeText={val => handleChangeItem(index, 'unit', val)} placeholder="pcs, hr" />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Price * ({getCurrencySymbol(orgCurrency).trim()})</Text>
                  <TextInput style={styles.input} value={item.unitPrice} onChangeText={val => handleChangeItem(index, 'unitPrice', val)} keyboardType="numeric" />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Tax (%)</Text>
                  <TextInput style={styles.input} value={item.taxRate} onChangeText={val => handleChangeItem(index, 'taxRate', val)} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Discount ({getCurrencySymbol(orgCurrency).trim()})</Text>
                  <TextInput
                    style={[styles.input, parseFloat(item.discount) > 0 && styles.inputDiscount]}
                    value={item.discount}
                    onChangeText={val => handleChangeItem(index, 'discount', val)}
                    keyboardType="numeric"
                    placeholder="0.00"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Net Amount</Text>
                  <View style={styles.netAmountBox}>
                    <Text style={styles.netAmountText}>
                      {formatCurrency(
                        Math.max(0,
                          (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
                          - (parseFloat(item.discount) || 0)
                        ),
                        orgCurrency
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </AccordionSection>

        {/* ── Summary ── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal, orgCurrency)}</Text>
          </View>
          {totalDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#10b981' }]}>Discount</Text>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>-{formatCurrency(totalDiscount, orgCurrency, { absolute: true })}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>{formatCurrency(taxAmount, orgCurrency)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalAmount, orgCurrency)}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backIcon: { marginRight: 16 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#4f46e5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  scrollContent: { padding: 16, gap: 12 },

  // Accordion
  card: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  accordionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
  },
  accordionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  accordionIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center',
  },
  accordionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1 },
  badge: {
    backgroundColor: '#eef2ff', borderRadius: 20, paddingHorizontal: 8,
    paddingVertical: 2, marginRight: 8, maxWidth: 130,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#4f46e5' },
  accordionBody: { borderTopWidth: 1, borderTopColor: '#f1f5f9', padding: 16, paddingTop: 14 },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row', backgroundColor: '#f1f5f9',
    borderRadius: 10, padding: 3, marginBottom: 16,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 8,
  },
  modeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  modeBtnTextActive: { color: '#4f46e5' },

  // Existing customer pick button
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#c7d2fe', borderStyle: 'dashed',
    borderRadius: 10, padding: 14, backgroundColor: '#f5f3ff',
  },
  pickBtnText: { flex: 1, fontSize: 14, color: '#4f46e5', fontWeight: '600' },

  // Selected customer card
  selectedCustomerCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 10, padding: 12,
  },
  selectedAvatarWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#4f46e5',
    alignItems: 'center', justifyContent: 'center',
  },
  selectedAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  selectedName: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 3 },
  selectedSub: { fontSize: 12, color: '#64748b', marginBottom: 1 },
  clearBtn: { padding: 4 },

  changeLinkRow: { alignItems: 'flex-end', marginTop: 8 },
  changeLink: { fontSize: 13, color: '#4f46e5', fontWeight: '600', textDecorationLine: 'underline' },

  // Form inputs
  inputGroup: { marginBottom: 12 },
  label: {
    fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 5,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#0f172a', backgroundColor: '#fafafa',
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },

  // Invoice number
  invoiceNumRow: { flexDirection: 'row', alignItems: 'center' },
  hintText: { fontSize: 11, color: '#94a3b8', marginTop: 4 },

  // Line items
  addBtnRow: { marginBottom: 12, alignItems: 'flex-end' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
  },
  addBtnText: { color: '#4f46e5', fontSize: 13, fontWeight: '600' },
  itemBox: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, padding: 12, marginBottom: 10,
  },
  itemBoxHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  itemBoxTitle: { fontSize: 13, fontWeight: '700', color: '#475569' },
  removeBtn: { backgroundColor: '#fef2f2', borderRadius: 6, padding: 6 },

  // Summary
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  summaryLabel: { fontSize: 14, color: '#64748b' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#334155' },
  summaryDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#4f46e5' },

  // Customer picker modal
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  modalClose: { padding: 4 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  modalCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 14, color: '#64748b' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  emptySubText: { fontSize: 13, color: '#94a3b8' },

  // Customer list row
  customerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
  },
  customerAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#eef2ff',
    alignItems: 'center', justifyContent: 'center',
  },
  customerAvatarText: { fontSize: 16, fontWeight: '700', color: '#4f46e5' },
  customerRowInfo: { flex: 1 },
  customerRowName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  customerRowSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  separator: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 68 },

  // Discount field styles
  inputDiscount: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  netAmountBox: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#f1f5f9', justifyContent: 'center',
  },
  netAmountText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
});
