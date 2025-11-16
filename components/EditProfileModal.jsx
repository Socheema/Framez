import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { hp, wp } from '../helpers/common';
import { useAuthStore } from '../stores/auth';
import { useThemeStore } from '../stores/themeStore';
import { supabase } from '../utils/supabase';

export default function EditProfileModal({ visible, onClose }) {
  const { isDarkMode, toggleTheme, theme } = useThemeStore();
  const colors = theme.colors;
  const router = useRouter();
  const { user, profile, updateProfile, logout } = useAuthStore();

  // Local modal states
  const [showEditInfo, setShowEditInfo] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit Profile Info form state
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [savingInfo, setSavingInfo] = useState(false);

  // Change Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete Account state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Themed styles for inner modals/inputs
  const modalStyles = useMemo(() => StyleSheet.create({
    sheetOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: wp(5) },
    sheetContent: { width: '100%', maxWidth: wp(90), borderRadius: 16, backgroundColor: colors.surface, padding: wp(5) },
    sheetHeader: { marginBottom: hp(1) },
    sheetTitle: { fontSize: hp(2.4), fontWeight: '700', color: colors.text },
    sheetSubtitle: { fontSize: hp(1.7), color: colors.textLight, marginTop: 4 },
    inputLabel: { fontSize: hp(1.6), fontWeight: '600', color: colors.text, marginTop: hp(1.5), marginBottom: hp(0.5) },
    input: { backgroundColor: colors.inputBackground, color: colors.text, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, paddingHorizontal: wp(3), paddingVertical: Platform.OS === 'ios' ? hp(1.3) : hp(1), fontSize: hp(1.8) },
    textArea: { minHeight: hp(10), textAlignVertical: 'top' },
    row: { flexDirection: 'row', gap: wp(2), marginTop: hp(2) },
    button: { flex: 1, paddingVertical: hp(1.6), borderRadius: 12, alignItems: 'center' },
    btnPrimary: { backgroundColor: theme.colors.primary },
    btnDanger: { backgroundColor: theme.colors.rose },
    btnGhost: { backgroundColor: colors.surfaceLight },
    btnTextPrimary: { color: '#fff', fontWeight: theme.fonts.semibold, fontSize: hp(2) },
    btnText: { color: colors.text, fontWeight: theme.fonts.semibold, fontSize: hp(2) },
    warnText: { color: theme.colors.rose, marginTop: hp(1), fontSize: hp(1.6) },
  }), [colors, theme]);

  // Handlers
  const handleSaveProfileInfo = async () => {
    if (savingInfo) return;
    setSavingInfo(true);
    try {
      const updates = {
        full_name: fullName?.trim() || null,
        username: username?.trim() || null,
        bio: bio?.trim() || null,
      };
      const res = await updateProfile(updates);
      if (!res?.success) {
        Alert.alert('Update Failed', res?.error || 'Could not update profile.');
        return;
      }
      Alert.alert('Success', 'Profile updated successfully.');
      setShowEditInfo(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async () => {
    if (changingPassword) return;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Missing Fields', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      // Re-authenticate using current password
      const email = user?.email;
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (signInError) {
        Alert.alert('Invalid Password', 'Your current password is incorrect.');
        setChangingPassword(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        Alert.alert('Update Failed', updateError.message || 'Failed to update password.');
        setChangingPassword(false);
        return;
      }

      Alert.alert('Password Updated', 'Please sign in again with your new password.');
      // Log out and redirect
      await logout();
      setShowChangePassword(false);
      onClose?.();
      router.replace('/login');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleting) return;
    if (deleteConfirmText.toUpperCase() !== 'DELETE') {
      Alert.alert('Confirmation Needed', "Please type 'DELETE' to confirm.");
      return;
    }

    setDeleting(true);
    try {
      const userId = user?.id;
      if (!userId) throw new Error('Not authenticated');

      // Delete related user data sequentially (best effort)
      const tables = [
        { name: 'likes', filter: { user_id: userId } },
        { name: 'comments', filter: { user_id: userId } },
        // follows: delete where user is follower or following
      ];

      for (const t of tables) {
        try {
          await supabase.from(t.name).delete().eq('user_id', t.filter.user_id);
        } catch (_) {}
      }

      // follows requires OR filter
      try {
        await supabase.from('follows').delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`);
      } catch (_) {}

      // posts
      try {
        await supabase.from('posts').delete().eq('user_id', userId);
      } catch (_) {}

      // profile
      try {
        await supabase.from('profiles').delete().eq('id', userId);
      } catch (_) {}

      // Auth user deletion requires service role; attempt optional Edge Function
      try {
        if (supabase.functions) {
          await supabase.functions.invoke('delete-account', { body: { userId } });
        }
      } catch (e) {
        console.log('Edge function delete-account not available or failed:', e?.message);
      }

      Alert.alert('Account Deleted', 'Your account data has been removed.');
      await logout();
      setShowDeleteConfirm(false);
      onClose?.();
      router.replace('/welcome');
    } catch (e) {
      Alert.alert('Delete Failed', e?.message || 'Could not delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Edit Profile
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {/* Dark Mode Toggle */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textLight }]}>
                APPEARANCE
              </Text>

              <View style={[styles.settingItem, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0' }]}>
                    <Ionicons
                      name={isDarkMode ? "moon" : "sunny"}
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>
                      Dark Mode
                    </Text>
                    <Text style={[styles.settingDescription, { color: colors.textLight }]}>
                      {isDarkMode ? 'Dark theme active' : 'Light theme active'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.gray, true: colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? undefined : '#ffffff'}
                  ios_backgroundColor={colors.gray}
                />
              </View>
            </View>

            {/* Profile Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textLight }]}>
                PROFILE
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  // prime fields with current values each time
                  setFullName(profile?.full_name || '');
                  setUsername(profile?.username || '');
                  setBio(profile?.bio || '');
                  setShowEditInfo(true);
                }}
                style={[styles.settingItem, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0' }]}>
                    <Ionicons name="person-outline" size={22} color={colors.text} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Edit Profile Info</Text>
                    <Text style={[styles.settingDescription, { color: colors.textLight }]}>Name, username, bio</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>

              {/* Optional Change Avatar can remain unimplemented here since avatar is handled on Profile screen */}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textLight }]}>
                SECURITY & PRIVACY
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowChangePassword(true)}
                style={[styles.settingItem, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0' }]}>
                    <Ionicons name="lock-closed-outline" size={22} color={colors.text} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Change Password</Text>
                    <Text style={[styles.settingDescription, { color: colors.textLight }]}>Update your account password</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowDeleteConfirm(true)}
                style={[styles.settingItem, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0' }]}>
                    <Ionicons name="trash-outline" size={22} color={theme.colors.rose} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingTitle, { color: theme.colors.rose }]}>Delete Account</Text>
                    <Text style={[styles.settingDescription, { color: colors.textLight }]}>Permanently remove your account</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
  </Modal>

    {/* Edit Profile Info Modal */}
    <Modal
      visible={showEditInfo}
      animationType="fade"
      transparent
      onRequestClose={() => setShowEditInfo(false)}
    >
      <View style={modalStyles.sheetOverlay}>
        <View style={modalStyles.sheetContent}>
          <View style={modalStyles.sheetHeader}>
            <Text style={modalStyles.sheetTitle}>Edit Profile Info</Text>
            <Text style={modalStyles.sheetSubtitle}>Update your name, username, and bio</Text>
          </View>

          <Text style={modalStyles.inputLabel}>Full Name</Text>
          <TextInput
            style={modalStyles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            placeholderTextColor={colors.textLight}
          />

          <Text style={modalStyles.inputLabel}>Username</Text>
          <TextInput
            style={modalStyles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="Choose a username"
            placeholderTextColor={colors.textLight}
          />

          <Text style={modalStyles.inputLabel}>Bio</Text>
          <TextInput
            style={[modalStyles.input, modalStyles.textArea]}
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={180}
            placeholder="Tell something about yourself"
            placeholderTextColor={colors.textLight}
          />

          <View style={modalStyles.row}>
            <TouchableOpacity style={[modalStyles.button, modalStyles.btnGhost]} onPress={() => setShowEditInfo(false)}>
              <Text style={modalStyles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.btnPrimary]}
              onPress={handleSaveProfileInfo}
              disabled={savingInfo}
            >
              <Text style={modalStyles.btnTextPrimary}>{savingInfo ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
  </Modal>

    {/* Change Password Modal */}
    <Modal
      visible={showChangePassword}
      animationType="fade"
      transparent
      onRequestClose={() => setShowChangePassword(false)}
    >
      <View style={modalStyles.sheetOverlay}>
        <View style={modalStyles.sheetContent}>
          <View style={modalStyles.sheetHeader}>
            <Text style={modalStyles.sheetTitle}>Change Password</Text>
            <Text style={modalStyles.sheetSubtitle}>Enter your current and new password</Text>
          </View>

          <Text style={modalStyles.inputLabel}>Current Password</Text>
          <TextInput
            style={modalStyles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="Current password"
            placeholderTextColor={colors.textLight}
          />

          <Text style={modalStyles.inputLabel}>New Password</Text>
          <TextInput
            style={modalStyles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="New password"
            placeholderTextColor={colors.textLight}
          />

          <Text style={modalStyles.inputLabel}>Confirm New Password</Text>
          <TextInput
            style={modalStyles.input}
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            secureTextEntry
            placeholder="Confirm new password"
            placeholderTextColor={colors.textLight}
          />

          <View style={modalStyles.row}>
            <TouchableOpacity style={[modalStyles.button, modalStyles.btnGhost]} onPress={() => setShowChangePassword(false)}>
              <Text style={modalStyles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.btnPrimary]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              <Text style={modalStyles.btnTextPrimary}>{changingPassword ? 'Updating…' : 'Update'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
  </Modal>

    {/* Delete Account Modal */}
    <Modal
      visible={showDeleteConfirm}
      animationType="fade"
      transparent
      onRequestClose={() => setShowDeleteConfirm(false)}
    >
      <View style={modalStyles.sheetOverlay}>
        <View style={modalStyles.sheetContent}>
          <View style={modalStyles.sheetHeader}>
            <Text style={modalStyles.sheetTitle}>Delete Account</Text>
            <Text style={modalStyles.sheetSubtitle}>This action cannot be undone.</Text>
            <Text style={modalStyles.warnText}>Type DELETE to confirm permanent deletion.</Text>
          </View>

          <Text style={modalStyles.inputLabel}>Confirm</Text>
          <TextInput
            style={modalStyles.input}
            value={deleteConfirmText}
            onChangeText={setDeleteConfirmText}
            placeholder="Type DELETE"
            placeholderTextColor={colors.textLight}
            autoCapitalize="characters"
          />

          <View style={modalStyles.row}>
            <TouchableOpacity style={[modalStyles.button, modalStyles.btnGhost]} onPress={() => setShowDeleteConfirm(false)}>
              <Text style={modalStyles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.btnDanger]}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              <Text style={modalStyles.btnTextPrimary}>{deleting ? 'Deleting…' : 'Delete'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? hp(4) : hp(2),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: hp(2.5),
    fontWeight: '700',
  },
  closeButton: {
    padding: wp(2),
  },
  modalBody: {
    paddingHorizontal: wp(5),
  },
  section: {
    marginTop: hp(3),
  },
  sectionTitle: {
    fontSize: hp(1.4),
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: hp(1.5),
    paddingLeft: wp(1),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: wp(4),
    borderRadius: 12,
    marginBottom: hp(1),
    borderWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: hp(1.9),
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: hp(1.5),
  },
});
