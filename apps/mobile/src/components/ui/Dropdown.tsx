import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export interface DropdownOption<T extends string> {
  label: string;
  value: T;
}

interface DropdownProps<T extends string> {
  options: DropdownOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  placeholder?: string;
  /** Adds a "None" row so a set value can be taken back off. */
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  /** Announced by screen readers in place of the visible form label. */
  accessibilityLabel?: string;
}

/**
 * Single-select dropdown.
 *
 * The option list expands inline rather than in a Modal: this control is used
 * inside form sheets that are themselves Modals, and stacking Modals on Android
 * costs focus and keyboard reliability for no visual gain. The list is a plain
 * View, so the surrounding ScrollView keeps handling the scrolling.
 */
export function Dropdown<T extends string>({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  allowClear = false,
  clearLabel = 'None',
  disabled = false,
  accessibilityLabel,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const selected = options.find((option) => option.value === value) ?? null;

  const select = (next: T | null) => {
    onChange(next);
    setIsOpen(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.trigger, isOpen && styles.triggerOpen, disabled && styles.triggerDisabled]}
        onPress={() => setIsOpen((open) => !open)}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: isOpen, disabled }}
        accessibilityHint="Opens a list of options"
      >
        <Text
          style={[styles.triggerText, !selected && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={disabled ? Colors.text.disabled : Colors.text.tertiary}
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.list}>
          {allowClear && (
            <TouchableOpacity
              style={styles.option}
              onPress={() => select(null)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: !selected }}
            >
              <Text style={[styles.optionText, styles.clearText]}>{clearLabel}</Text>
              {!selected && (
                <Ionicons name="checkmark" size={18} color={Colors.primary[500]} />
              )}
            </TouchableOpacity>
          )}

          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => select(option.value)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary[500]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  triggerOpen: {
    borderColor: Colors.primary[500],
  },
  triggerDisabled: {
    opacity: 0.6,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    marginRight: 8,
  },
  triggerPlaceholder: {
    color: Colors.text.disabled,
  },
  list: {
    marginTop: 6,
    backgroundColor: Colors.neutral[0],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  optionSelected: {
    backgroundColor: '#FFF5F5',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.secondary,
    marginRight: 8,
  },
  optionTextSelected: {
    color: Colors.primary[500],
    fontWeight: '700',
  },
  clearText: {
    fontStyle: 'italic',
    color: Colors.text.tertiary,
  },
});
