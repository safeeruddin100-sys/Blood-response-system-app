import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BLOOD_GROUPS, BloodGroup } from '@/constants/bloodGroups';
import { useTheme } from '@/constants/theme';

interface BloodGroupPickerProps {
  selectedGroup: string;
  onSelect: (group: BloodGroup) => void;
  label?: string;
}

export const BloodGroupPicker: React.FC<BloodGroupPickerProps> = ({
  selectedGroup,
  onSelect,
  label,
}) => {
  const C = useTheme();

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: C.textPrimary }]}>{label}</Text>}
      <View style={styles.grid}>
        {BLOOD_GROUPS.map((group) => {
          const isSelected = selectedGroup === group;
          return (
            <TouchableOpacity
              key={group}
              onPress={() => onSelect(group)}
              activeOpacity={0.7}
              style={[
                styles.item,
                { backgroundColor: C.surface, borderColor: C.border },
                isSelected && { backgroundColor: C.primary, borderColor: C.primary },
              ]}
            >
              <Text
                style={[
                  styles.itemText,
                  { color: C.textPrimary },
                  isSelected && { color: C.textInverse },
                ]}
              >
                {group}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  item: {
    width: '22%',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
