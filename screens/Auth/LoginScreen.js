import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Keyboard,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, radii, shadows, spacing, typography } from '../../theme';

const KEYBOARD_SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const KEYBOARD_HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

const BASE_SCROLL_PAD = spacing.xl * 2;
const HERO_MAX = 720;

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef(null);
  const passwordRef = useRef(null);

  /** 1 = keyboard hidden (full hero), 0 = keyboard open (compact). */
  const expandT = useRef(new Animated.Value(1)).current;
  /** Extra bottom inset from keyboard (0 when closed). */
  const kbPad = useRef(new Animated.Value(0)).current;
  const basePad = useRef(new Animated.Value(BASE_SCROLL_PAD)).current;
  const scrollBottomPad = useMemo(() => Animated.add(kbPad, basePad), [kbPad, basePad]);

  const [layoutStacked, setLayoutStacked] = useState(false);

  useEffect(() => {
    const animateOpen = (e) => {
      const h = e?.endCoordinates?.height ?? 0;
      const androidExtra = Platform.OS === 'android' ? insets.bottom : 0;
      const target = Math.max(0, h + androidExtra);
      const duration = Platform.OS === 'ios'
        ? Math.min(Math.max(e?.duration ?? 250, 200), 380)
        : 260;

      setLayoutStacked(true);

      Animated.parallel([
        Animated.timing(kbPad, {
          toValue: target,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(expandT, {
          toValue: 0,
          duration: duration * 0.92,
          easing: Easing.bezier(0.33, 0.01, 0.19, 0.99),
          useNativeDriver: false,
        }),
      ]).start(() => {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        });
      });
    };

    const animateClose = (e) => {
      const duration = Platform.OS === 'ios'
        ? Math.min(Math.max(e?.duration ?? 260, 200), 400)
        : 240;

      Animated.parallel([
        Animated.timing(kbPad, {
          toValue: 0,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(expandT, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start(() => {
        setLayoutStacked(false);
      });
    };

    const subShow = Keyboard.addListener(KEYBOARD_SHOW, animateOpen);
    const subHide = Keyboard.addListener(KEYBOARD_HIDE, animateClose);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [insets.bottom]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing information', 'Enter both your email and password.');
      return;
    }

    const result = await login(email, password);
    if (result && !result.success) {
      Alert.alert('Sign in failed', result.error);
    }
  };

  const scrollMinHeight = Math.max(0, windowHeight - insets.top - insets.bottom);

  const fullHeroOpacity = expandT;
  const fullHeroSlide = expandT.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
    extrapolate: 'clamp',
  });
  const fullHeroMaxH = expandT.interpolate({
    inputRange: [0, 1],
    outputRange: [0, HERO_MAX],
    extrapolate: 'clamp',
  });
  const fullHeroMarginBottom = expandT.interpolate({
    inputRange: [0, 1],
    outputRange: [spacing.sm, spacing.xl],
    extrapolate: 'clamp',
  });

  const compactHeaderOpacity = expandT.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [1, 0.35, 0],
    extrapolate: 'clamp',
  });
  const compactHeaderY = expandT.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
    extrapolate: 'clamp',
  });

  const cardHeaderFullOpacity = expandT;
  const cardHeaderKbOpacity = expandT.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.25, 0],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              flexGrow: 1,
              minHeight: scrollMinHeight,
              justifyContent: layoutStacked ? 'flex-start' : 'center',
              paddingBottom: scrollBottomPad,
              paddingTop: layoutStacked ? spacing.sm : spacing.md,
            },
          ]}
        >
          <View style={styles.column}>
            <Animated.View
              style={{
                opacity: fullHeroOpacity,
                maxHeight: fullHeroMaxH,
                marginBottom: fullHeroMarginBottom,
                overflow: 'hidden',
                transform: [{ translateY: fullHeroSlide }],
              }}
              pointerEvents={layoutStacked ? 'none' : 'auto'}
            >
              <View style={styles.hero}>
                <View style={styles.badge}>
                  <ShieldCheck size={18} color={colors.primary} />
                  <Text style={styles.badgeText}>Mobile ERP Workspace</Text>
                </View>
                <Text style={styles.title}>Zeeventory</Text>
                <Text style={styles.subtitle}>
                  Sign in to review invoices, quotations, products, and operational data from one secure
                  workspace.
                </Text>
              </View>
            </Animated.View>

            <Animated.View
              style={{
                opacity: compactHeaderOpacity,
                marginBottom: spacing.md,
                transform: [{ translateY: compactHeaderY }],
              }}
              pointerEvents={layoutStacked ? 'auto' : 'none'}
            >
              <Text style={styles.heroCompactTitle}>Sign in</Text>
            </Animated.View>

            <View style={styles.card}>
              <View style={styles.cardHeaderSlot}>
                <Animated.View style={{ opacity: cardHeaderFullOpacity }}>
                  <Text style={styles.cardTitle}>Account Access</Text>
                  <Text style={styles.cardCaption}>Use your existing ERP credentials.</Text>
                </Animated.View>
                <Animated.View
                  style={[styles.cardKbHeaderOverlay, { opacity: cardHeaderKbOpacity }]}
                  pointerEvents={layoutStacked ? 'box-none' : 'none'}
                >
                  <Text style={styles.cardCaptionKb}>Enter your credentials</Text>
                </Animated.View>
              </View>

              <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <View style={styles.inputShell}>
                    <Mail size={18} color={colors.textSoft} />
                    <TextInput
                      style={styles.input}
                      placeholder="name@company.com"
                      placeholderTextColor={colors.textSoft}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputShell}>
                    <LockKeyhole size={18} color={colors.textSoft} />
                    <TextInput
                      ref={passwordRef}
                      style={styles.input}
                      placeholder="Enter password"
                      placeholderTextColor={colors.textSoft}
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      returnKeyType="go"
                      onSubmitEditing={handleLogin}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.surface} />
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
            </View>
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  column: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  hero: {
    marginBottom: 0,
  },
  heroCompactTitle: {
    ...typography.sectionTitle,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: spacing.lg,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    ...typography.title,
    fontSize: 38,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.subtitle,
    lineHeight: 22,
    maxWidth: 340,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeaderSlot: {
    position: 'relative',
    minHeight: 88,
    marginBottom: spacing.md,
  },
  cardKbHeaderOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  cardCaption: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 0,
  },
  cardCaptionKb: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 8,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
});
