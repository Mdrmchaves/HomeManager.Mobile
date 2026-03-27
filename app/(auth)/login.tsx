import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Svg, { Rect, Path, Polygon } from 'react-native-svg';
import { AuthService } from '../../services/auth.service';
import { Colors } from '../../constants/colors';

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <View style={{ alignItems: 'center', marginBottom: 24 }}>
      <Svg width={64} height={64} viewBox="0 0 56 56">
        <Rect width={56} height={56} rx={14} fill="#2D6A4F" />
        <Path
          d="M28 9 L7 27 L13 27 L13 47 L24 47 L24 34 L32 34 L32 47 L43 47 L43 27 L49 27 Z"
          fill="white"
        />
        {/* Janela — buraco verde no telhado */}
        <Polygon points="23.5,17 28,12.5 32.5,17 32.5,27 23.5,27" fill="#2D6A4F" />
      </Svg>

      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <Text style={{
          fontFamily: 'Nunito_800ExtraBold',
          fontSize: 26,
          color: '#261e0f',
          lineHeight: 30,
        }}>
          Home
        </Text>
        <Text style={{
          fontFamily: 'Nunito_700Bold',
          fontSize: 13,
          color: '#6b5c3e',
          letterSpacing: 3,
        }}>
          MANAGER
        </Text>
      </View>
    </View>
  );
}

type Mode = 'login' | 'register';
type Screen = 'form' | 'confirm';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [screen, setScreen] = useState<Screen>('form');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmedEmail, setConfirmedEmail] = useState('');

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
  }

  function validate(): boolean {
    if (mode === 'register' && !name.trim()) {
      setError('O nome é obrigatório.');
      return false;
    }
    if (!email.trim()) {
      setError('O email é obrigatório.');
      return false;
    }
    if (!password.trim()) {
      setError('A password é obrigatória.');
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        await AuthService.signIn(email.trim(), password);
        // Navigation handled by root _layout.tsx via onAuthStateChange
      } else {
        await AuthService.signUp(email.trim(), password, name.trim());
        setConfirmedEmail(email.trim());
        setScreen('confirm');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro. Tenta novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleBackToLogin() {
    setScreen('form');
    setMode('login');
    setName('');
    setEmail('');
    setPassword('');
    setError('');
    setConfirmedEmail('');
  }

  if (screen === 'confirm') {
    return (
      <View style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.confirmIcon}>📧</Text>
          <Text style={styles.confirmTitle}>Verifica o teu email</Text>
          <Text style={styles.confirmBody}>
            Enviámos um link de confirmação para:
          </Text>
          <Text style={styles.confirmEmail}>{confirmedEmail}</Text>
          <Text style={styles.confirmHint}>
            Abre o email e clica no link para activar a tua conta.
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleBackToLogin}>
            <Text style={styles.secondaryButtonText}>Voltar ao login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Logo */}
          <Logo />

          {/* Mode toggle */}
          <View style={styles.toggleBar}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
              onPress={() => switchMode('login')}
            >
              <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>
                Entrar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'register' && styles.toggleBtnActive]}
              onPress={() => switchMode('register')}
            >
              <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>
                Criar conta
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name field (register only) */}
          {mode === 'register' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="O teu nome"
                placeholderTextColor={Colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          )}

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="exemplo@email.com"
              placeholderTextColor={Colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor={Colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error message */}
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading
                ? mode === 'login'
                  ? 'A entrar...'
                  : 'A criar conta...'
                : mode === 'login'
                ? 'Entrar'
                : 'Criar conta'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Logo
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoLetter: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },

  // Toggle
  toggleBar: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },

  // Fields
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },

  // Error
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
  },

  // Primary button
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Confirmation screen
  confirmIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  confirmEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
});
