import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ChevronDown, ChevronUp, KeyRound, LogOut, Phone, Trash2, User } from 'lucide-react-native'
import { useState, type ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { changePassword, deleteAccount, getAuthErrorDetails, updateProfile } from '../api/auth'
import { PillButton } from '../components/AuthLight'
import { DarkHeader, DarkScreen } from '../components/DarkScreen'
import { PillInput } from '../components/PillInput'
import { ScreenLoader } from '../components/ScreenLoader'
import { useAuth } from '../context/AuthContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'
import { confirmAction, notify } from '../utils/notify'
import { normalizePhone, validateName, validatePassword, validatePhone } from '../utils/validation'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Profile'>
type Section = 'password' | 'delete' | null

function initialsOf(firstName?: string, lastName?: string) {
  return `${(firstName || '').trim().charAt(0)}${(lastName || '').trim().charAt(0)}`.toUpperCase() || '·'
}

export function ProfileScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const { updateUser, signOut } = useAuth()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; phone?: string }>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [open, setOpen] = useState<Section>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwErrors, setPwErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [pwMsg, setPwMsg] = useState<string | null>(null)
  const [savingPw, setSavingPw] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | undefined>()
  const [deleting, setDeleting] = useState(false)

  if (authLoading || !user) {
    return (
      <DarkScreen>
        <DarkHeader title="Mon profil" onBack={() => navigation.goBack()} icon={User} />
        <ScreenLoader />
      </DarkScreen>
    )
  }

  const isGoogle = user.authProvider === 'google'
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
  const subtitle = (user.email || user.phone || '').trim()

  const saveProfile = async () => {
    const errs = {
      firstName: validateName(firstName, 'Le prénom'),
      lastName: validateName(lastName, 'Le nom'),
      phone: validatePhone(phone),
    }
    if (Object.values(errs).some(Boolean)) {
      setErrors(errs)
      return
    }
    setErrors({})
    setMsg(null)
    setSaving(true)
    try {
      const { user: updated } = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalizePhone(phone),
      })
      await updateUser(updated)
      setMsg('Profil mis à jour ✓')
    } catch (error) {
      setErrors({ firstName: getAuthErrorDetails(error).message })
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async () => {
    const errs: typeof pwErrors = {}
    if (!currentPassword) errs.current = 'Mot de passe actuel requis'
    const nextError = validatePassword(newPassword)
    if (nextError) errs.next = nextError
    if (confirmPassword !== newPassword) errs.confirm = 'Les mots de passe ne correspondent pas'
    if (Object.values(errs).some(Boolean)) {
      setPwErrors(errs)
      return
    }
    setPwErrors({})
    setPwMsg(null)
    setSavingPw(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setPwMsg('Mot de passe modifié ✓')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setPwErrors({ current: getAuthErrorDetails(error).message })
    } finally {
      setSavingPw(false)
    }
  }

  const logout = async () => {
    await signOut()
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
  }

  const removeAccount = async () => {
    if (!isGoogle && !deletePassword) {
      setDeleteError('Saisis ton mot de passe pour confirmer')
      return
    }
    const ok = await confirmAction(
      'Supprimer mon compte',
      'Cette action est définitive. Profil, abonnements liés et notifications seront effacés.',
      'Supprimer',
    )
    if (!ok) return
    setDeleteError(undefined)
    setDeleting(true)
    try {
      await deleteAccount({ confirm: true, password: isGoogle ? undefined : deletePassword })
      await signOut()
      navigation.reset({ index: 0, routes: [{ name: 'Intro' }] })
    } catch (error) {
      const message = getAuthErrorDetails(error).message
      setDeleteError(message)
      notify('Suppression impossible', message)
    } finally {
      setDeleting(false)
    }
  }

  const toggle = (section: Exclude<Section, null>) => setOpen((cur) => (cur === section ? null : section))

  return (
    <DarkScreen hideFooter>
      <DarkHeader title="Mon profil" onBack={() => navigation.goBack()} icon={User} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsOf(user.firstName, user.lastName)}</Text>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.name} numberOfLines={1}>
                {fullName || 'Mon compte'}
              </Text>
              {subtitle ? (
                <Text style={styles.sub} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
              <View style={styles.chip}>
                <Text style={styles.chipText}>{isGoogle ? 'Compte Google' : 'Compte téléphone'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.half}>
                <PillInput
                  compact
                  label="Prénom"
                  placeholder="Prénom"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  error={errors.firstName}
                />
              </View>
              <View style={styles.half}>
                <PillInput
                  compact
                  label="Nom"
                  placeholder="Nom"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  error={errors.lastName}
                />
              </View>
            </View>
            <PillInput
              compact
              label="Téléphone"
              icon={Phone}
              placeholder="Téléphone (ex. 0147880143)"
              value={phone}
              onChangeText={(v) => setPhone(normalizePhone(v))}
              keyboardType="phone-pad"
              error={errors.phone}
            />
            {!String(phone || '').trim() ? (
              <Text style={styles.hint}>Ajoute ton numéro pour payer en Mobile Money et recevoir les rappels.</Text>
            ) : null}
            {msg ? <Text style={styles.success}>{msg}</Text> : null}
            <PillButton label={saving ? 'Enregistrement…' : 'Enregistrer'} onPress={saveProfile} disabled={saving} />
          </View>

          <View style={styles.list}>
            {!isGoogle ? (
              <Accordion
                icon={<KeyRound size={18} color={dark.green} />}
                title="Changer le mot de passe"
                open={open === 'password'}
                onToggle={() => toggle('password')}
              >
                <PillInput compact label="Mot de passe actuel" placeholder="Mot de passe actuel" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} error={pwErrors.current} />
                <PillInput compact label="Nouveau mot de passe" placeholder="Nouveau mot de passe" secureTextEntry value={newPassword} onChangeText={setNewPassword} error={pwErrors.next} />
                <PillInput compact label="Confirmer" placeholder="Confirmer le mot de passe" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} error={pwErrors.confirm} />
                {pwMsg ? <Text style={styles.success}>{pwMsg}</Text> : null}
                <PillButton label={savingPw ? 'Modification…' : 'Modifier le mot de passe'} onPress={savePassword} disabled={savingPw} />
              </Accordion>
            ) : null}

            <Accordion
              icon={<Trash2 size={18} color={dark.coral} />}
              title="Supprimer mon compte"
              danger
              open={open === 'delete'}
              onToggle={() => toggle('delete')}
              last
            >
              <Text style={styles.dangerText}>
                La suppression est définitive : profil, abonnements liés et notifications seront effacés.
              </Text>
              {!isGoogle ? (
                <PillInput compact label="Mot de passe" placeholder="Mot de passe pour confirmer" secureTextEntry value={deletePassword} onChangeText={setDeletePassword} />
              ) : null}
              {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
              <Pressable onPress={removeAccount} disabled={deleting} style={[styles.dangerBtn, deleting && { opacity: 0.6 }]} accessibilityRole="button">
                <Text style={styles.dangerBtnText}>{deleting ? 'Suppression…' : 'Supprimer définitivement'}</Text>
              </Pressable>
            </Accordion>
          </View>

          <Pressable onPress={logout} style={({ pressed }) => [styles.logout, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="Se déconnecter">
            <LogOut size={18} color={dark.coral} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </DarkScreen>
  )
}

function Accordion({
  icon,
  title,
  open,
  onToggle,
  children,
  danger,
  last,
}: {
  icon: ReactNode
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  danger?: boolean
  last?: boolean
}) {
  return (
    <View style={[styles.acc, !last && styles.accDivider]}>
      <Pressable onPress={onToggle} style={styles.accHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        {icon}
        <Text style={[styles.accTitle, danger && { color: dark.coral }]}>{title}</Text>
        {open ? <ChevronUp size={18} color={dark.textMuted} /> : <ChevronDown size={18} color={dark.textMuted} />}
      </Pressable>
      {open ? <View style={styles.accBody}>{children}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 24, gap: 14 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.greenSoft,
    borderWidth: 2,
    borderColor: 'rgba(0,176,80,0.35)',
  },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 22, color: dark.green },
  heroCopy: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.displayBold, fontSize: 20, color: dark.textPrimary },
  sub: { fontFamily: fonts.body, fontSize: 13, color: dark.textMuted },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: dark.greenSoft,
  },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: dark.green },
  card: {
    gap: 10,
    padding: 14,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: dark.border,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: '#B45309', marginHorizontal: 6 },
  success: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: dark.green, textAlign: 'center' },
  list: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: dark.border,
    overflow: 'hidden',
  },
  acc: { paddingHorizontal: 16 },
  accDivider: { borderBottomWidth: 1, borderBottomColor: dark.border },
  accHead: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54 },
  accTitle: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: dark.textPrimary },
  accBody: { gap: 10, paddingBottom: 16 },
  dangerText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: dark.textMuted },
  errorText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: dark.coral, marginLeft: 6 },
  dangerBtn: {
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.coral,
  },
  dangerBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#FFFFFF' },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 999,
    backgroundColor: dark.coralSoft,
  },
  logoutText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: dark.coral },
})
