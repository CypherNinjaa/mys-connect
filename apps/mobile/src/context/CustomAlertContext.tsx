import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertOptions {
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  buttons?: AlertButton[];
  /**
   * Fired when the alert closes without a button being pressed (backdrop tap or
   * Android back). Callers that await a decision need this — otherwise a
   * dismissal leaves their promise pending forever.
   */
  onDismiss?: () => void;
}

interface CustomAlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const CustomAlertContext = createContext<CustomAlertContextType>({
  showAlert: () => {},
  hideAlert: () => {},
});

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CustomAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);

  // Guards against onDismiss firing twice, or firing after a button already
  // handled the close.
  const settledRef = useRef(true);

  const showAlert = useCallback((opts: AlertOptions) => {
    settledRef.current = false;
    setOptions(opts);
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setOptions(null);
    }, 200);
  }, []);

  /** Close triggered by the backdrop or hardware back, not by a button. */
  const dismissAlert = useCallback(() => {
    const onDismiss = options?.onDismiss;
    const wasUnsettled = !settledRef.current;
    settledRef.current = true;
    hideAlert();
    if (wasUnsettled && onDismiss) {
      onDismiss();
    }
  }, [hideAlert, options]);

  const handleButtonPress = (btn?: AlertButton) => {
    settledRef.current = true;
    hideAlert();
    if (btn?.onPress) {
      btn.onPress();
    }
  };

  const getIconConfig = (type?: string) => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle-outline' as const, color: '#276749', bg: '#C6F6D5' };
      case 'error':
        return { name: 'alert-circle-outline' as const, color: '#C53030', bg: '#FED7D7' };
      case 'warning':
      case 'confirm':
        return { name: 'warning-outline' as const, color: '#DD6B20', bg: '#FEEBC8' };
      case 'info':
      default:
        return { name: 'information-circle-outline' as const, color: Colors.primary[500], bg: '#EDF2F7' };
    }
  };

  const iconConfig = getIconConfig(options?.type);
  const buttons = options?.buttons && options.buttons.length > 0
    ? options.buttons
    : [{ text: 'OK', style: 'default' as const }];

  return (
    <CustomAlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {visible && options && (
        <Modal
          transparent
          visible={visible}
          animationType="fade"
          onRequestClose={dismissAlert}
        >
          <TouchableWithoutFeedback onPress={dismissAlert}>
            <View style={styles.overlay}>
              <TouchableWithoutFeedback>
                <View style={styles.card}>
                  <View style={[styles.iconBadge, { backgroundColor: iconConfig.bg }]}>
                    <Ionicons name={iconConfig.name} size={32} color={iconConfig.color} />
                  </View>

                  <Text style={styles.title}>{options.title}</Text>

                  {options.message ? (
                    <Text style={styles.message}>{options.message}</Text>
                  ) : null}

                  <View style={[styles.buttonRow, buttons.length > 2 && styles.buttonColumn]}>
                    {buttons.map((btn, idx) => {
                      const isDestructive = btn.style === 'destructive';
                      const isCancel = btn.style === 'cancel';
                      const isPrimary = !isDestructive && !isCancel;

                      return (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.8}
                          style={[
                            styles.button,
                            isPrimary && styles.primaryButton,
                            isDestructive && styles.destructiveButton,
                            isCancel && styles.cancelButton,
                            buttons.length === 2 && styles.halfButton,
                          ]}
                          onPress={() => handleButtonPress(btn)}
                        >
                          <Text
                            style={[
                              styles.buttonText,
                              isPrimary && styles.primaryButtonText,
                              isDestructive && styles.destructiveButtonText,
                              isCancel && styles.cancelButtonText,
                            ]}
                          >
                            {btn.text}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </CustomAlertContext.Provider>
  );
};

export const useCustomAlert = () => useContext(CustomAlertContext);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 48, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  halfButton: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: Colors.primary[500] || '#7A0E16',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  destructiveButton: {
    backgroundColor: '#E53E3E',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: '#EDF2F7',
    borderWidth: 1,
    borderColor: '#CBD5E0',
  },
  cancelButtonText: {
    color: '#4A5568',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
