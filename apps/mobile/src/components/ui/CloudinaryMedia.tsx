import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  ImageStyle,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCustomAlert } from '../../context/CustomAlertContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { buildCloudinaryUrl, downloadCloudinaryImage, CloudinaryTransformOptions } from '../../utils/cloudinary';
import { Colors } from '../../constants/theme';
import { PinchZoomImage } from './PinchZoomImage';

interface CloudinaryMediaProps {
  imageUri?: string | null;
  fallbackInitials?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  transformOptions?: CloudinaryTransformOptions;
  allowUpload?: boolean;
  allowDownload?: boolean;
  /** Show a "Remove photo" action. Requires `onRemove`. */
  allowRemove?: boolean;
  /** Tapping the image opens a full-screen viewer. */
  allowView?: boolean;
  onUploadSuccess?: (base64OrUri: string) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
  /** Title shown above the action sheet. */
  actionSheetTitle?: string;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

export function CloudinaryMedia({
  imageUri,
  fallbackInitials = 'M',
  width = 120,
  height = 120,
  borderRadius = 60,
  transformOptions = { crop: 'fill', gravity: 'face', quality: 'auto' },
  allowUpload = false,
  allowDownload = false,
  allowRemove = false,
  allowView = false,
  onUploadSuccess,
  onRemove,
  actionSheetTitle = 'Profile Photo',
  style,
  imageStyle,
}: CloudinaryMediaProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const { showAlert } = useCustomAlert();

  const optimizedUrl = imageUri ? buildCloudinaryUrl(imageUri, transformOptions) : null;
  const hasPhoto = Boolean(optimizedUrl);

  // The viewer wants the original, not the 88px avatar crop the badge renders.
  const fullSizeUrl = imageUri
    ? buildCloudinaryUrl(imageUri, { quality: 'auto', format: 'auto', width: 1200, height: 1200, crop: 'fit' })
    : null;

  const isBusy = isUploading || isRemoving;

  /** Whether tapping the avatar should do anything at all. */
  const isInteractive = allowUpload || allowRemove || (allowView && hasPhoto);

  const handlePickAndUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showAlert({ title: 'Permission Required', message: 'Gallery access permission is required to upload images.', type: 'warning' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setIsUploading(true);
        const asset = result.assets[0];
        const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;

        if (onUploadSuccess) {
          await onUploadSuccess(base64Data);
        }
      }
    } catch (err: any) {
      console.error('Cloudinary upload picker error:', err);
      showAlert({ title: 'Upload Error', message: err.message || 'Failed to select image', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!optimizedUrl) return;
    setIsDownloading(true);
    await downloadCloudinaryImage(optimizedUrl, `cloudinary_${Date.now()}.jpg`);
    setIsDownloading(false);
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    try {
      setIsRemoving(true);
      await onRemove();
    } finally {
      setIsRemoving(false);
    }
  };

  /**
   * Sheet actions close the sheet first, then run. Doing it in the other order
   * leaves the sheet sitting on top of the OS image picker.
   */
  const runSheetAction = (action: () => void) => {
    setSheetVisible(false);
    // One frame of daylight so the dismissal animation is not interrupted by a
    // second modal mounting on top of it.
    requestAnimationFrame(action);
  };

  const handleAvatarPress = () => {
    if (isBusy) return;

    // With a single sensible action available, skip the sheet entirely.
    if (!allowUpload && !allowRemove) {
      if (allowView && hasPhoto) setViewerVisible(true);
      return;
    }
    if (!hasPhoto && allowUpload) {
      void handlePickAndUpload();
      return;
    }
    setSheetVisible(true);
  };

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Pressable
        onPress={handleAvatarPress}
        disabled={!isInteractive || isBusy}
        accessibilityRole={isInteractive ? 'button' : 'image'}
        accessibilityLabel={hasPhoto ? 'Profile photo' : 'Add a profile photo'}
        style={({ pressed }) => [
          styles.imageWrapper,
          { width, height, borderRadius },
          pressed && isInteractive ? styles.imagePressed : null,
        ]}
      >
        {isBusy ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color={Colors.primary[500]} size="small" />
            <Text style={styles.statusText}>{isRemoving ? 'Removing...' : 'Uploading...'}</Text>
          </View>
        ) : optimizedUrl ? (
          <Image
            source={{ uri: optimizedUrl }}
            style={[styles.image, { width, height, borderRadius }, imageStyle]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.fallbackContainer, { borderRadius }]}>
            <Text style={[styles.initials, { fontSize: Math.min(width, height) * 0.4 }]}>
              {fallbackInitials[0]?.toUpperCase()}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Upload Badge Action */}
      {allowUpload && (
        <TouchableOpacity
          style={[styles.uploadBadge, { right: 0, bottom: 0 }]}
          onPress={handleAvatarPress}
          disabled={isBusy}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={hasPhoto ? 'Change profile photo' : 'Add profile photo'}
        >
          <Ionicons name="camera" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Download Action */}
      {allowDownload && optimizedUrl && (
        <TouchableOpacity
          style={[styles.downloadBadge, { left: 0, bottom: 0 }]}
          onPress={handleDownload}
          disabled={isDownloading}
          activeOpacity={0.8}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="download" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      )}

      {/* Action Sheet — View / Change / Remove */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSheetVisible(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheetVisible(false)}>
          {/* Swallow taps on the sheet itself so they don't dismiss it. */}
          <Pressable style={styles.sheetCard} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{actionSheetTitle}</Text>

            {allowView && hasPhoto && (
              <TouchableOpacity
                style={styles.sheetRow}
                activeOpacity={0.7}
                onPress={() => runSheetAction(() => setViewerVisible(true))}
              >
                <View style={styles.sheetIconCircle}>
                  <Ionicons name="eye-outline" size={20} color={Colors.primary[500]} />
                </View>
                <View style={styles.sheetTextBox}>
                  <Text style={styles.sheetRowTitle}>View photo</Text>
                  <Text style={styles.sheetRowSub}>Open full screen, pinch to zoom</Text>
                </View>
              </TouchableOpacity>
            )}

            {allowUpload && (
              <TouchableOpacity
                style={styles.sheetRow}
                activeOpacity={0.7}
                onPress={() => runSheetAction(() => void handlePickAndUpload())}
              >
                <View style={styles.sheetIconCircle}>
                  <Ionicons name="image-outline" size={20} color={Colors.primary[500]} />
                </View>
                <View style={styles.sheetTextBox}>
                  <Text style={styles.sheetRowTitle}>
                    {hasPhoto ? 'Change photo' : 'Upload photo'}
                  </Text>
                  <Text style={styles.sheetRowSub}>Choose an image from your gallery</Text>
                </View>
              </TouchableOpacity>
            )}

            {allowRemove && hasPhoto && (
              <TouchableOpacity
                style={[styles.sheetRow, styles.sheetRowLast]}
                activeOpacity={0.7}
                onPress={() => runSheetAction(() => void handleRemove())}
              >
                <View style={[styles.sheetIconCircle, styles.sheetIconDanger]}>
                  <Ionicons name="trash-outline" size={20} color="#C53030" />
                </View>
                <View style={styles.sheetTextBox}>
                  <Text style={[styles.sheetRowTitle, styles.sheetRowTitleDanger]}>Remove photo</Text>
                  <Text style={styles.sheetRowSub}>Go back to your initials</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.sheetCancelBtn}
              activeOpacity={0.8}
              onPress={() => setSheetVisible(false)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Full-Screen Photo Viewer */}
      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerOverlay}>
          <SafeAreaView style={styles.viewerSafeArea}>
            <View style={styles.viewerHeader}>
              <TouchableOpacity
                onPress={() => setViewerVisible(false)}
                style={styles.viewerCloseBtn}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                accessibilityRole="button"
                accessibilityLabel="Close photo"
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.viewerTitle} numberOfLines={1}>
                {actionSheetTitle}
              </Text>
              {/* Balances the close button so the title stays optically centred. */}
              <View style={styles.viewerCloseBtn} />
            </View>

            <View style={styles.viewerBody}>
              {fullSizeUrl && <PinchZoomImage uri={fullSizeUrl} />}
            </View>

            <Text style={styles.viewerHint}>Pinch or double-tap to zoom</Text>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    overflow: 'hidden',
    backgroundColor: '#EDF2F7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: Colors.secondary[500],
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    color: Colors.primary[500],
    marginTop: 4,
    fontWeight: '600',
  },
  uploadBadge: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary[500],
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  downloadBadge: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary[600],
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  imagePressed: {
    opacity: 0.75,
  },

  // Action sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E0',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.neutral[800],
    marginBottom: 6,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  sheetRowLast: {
    borderBottomWidth: 0,
  },
  sheetIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  sheetIconDanger: {
    backgroundColor: '#FFF5F5',
  },
  sheetTextBox: {
    flex: 1,
  },
  sheetRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[800],
  },
  sheetRowTitleDanger: {
    color: '#C53030',
  },
  sheetRowSub: {
    fontSize: 12.5,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  sheetCancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[700],
  },

  // Full-screen viewer
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
  },
  viewerSafeArea: {
    flex: 1,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  viewerCloseBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  viewerBody: {
    flex: 1,
  },
  viewerHint: {
    textAlign: 'center',
    color: '#A0AEC0',
    fontSize: 12.5,
    paddingBottom: 18,
    paddingTop: 8,
  },
});
