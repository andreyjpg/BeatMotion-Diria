import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import IconButton from "@/components/ui/IconButton";
import palette from "@/constants/palette.json";
import { useAvailableStudents } from "@/hooks/enrollment/useAvailableStudents";
import { useManualEnrollment } from "@/hooks/enrollment/useManualEnrollment";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AssignStudentModalProps = {
  visible: boolean;
  courseId: string;
  courseName: string;
  onClose: () => void;
};

/** Sheet to search for a student and add them to the course. */
export default function AssignStudentModal({ visible, courseId, courseName, onClose }: AssignStudentModalProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const availableStudentsQuery = useAvailableStudents(courseId);
  const manualEnrollment = useManualEnrollment();

  const filteredStudents =
    availableStudentsQuery.data?.filter((student) => {
      const fullName = `${student.name} ${student.lastName} ${student.email}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    }) ?? [];

  const handleAssignStudent = async () => {
    if (!selectedStudent) return;

    try {
      await manualEnrollment.mutateAsync({ userId: selectedStudent, courseId });
      setSelectedStudent(null);
      setSearchQuery("");
      onClose();
    } catch {
      // useManualEnrollment already showed the error.
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="h-4/5 rounded-t-[26px] bg-ground" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="flex-row items-center justify-between gap-3 px-5 pb-3 pt-5">
            <View className="flex-1">
              <AppText variant="display" className="text-[26px] leading-[30px]">
                Asignar estudiante
              </AppText>
              <AppText tone="muted" className="mt-0.5 text-[13.5px]" numberOfLines={1}>
                {courseName}
              </AppText>
            </View>
            <IconButton icon="close" onPress={onClose} accessibilityLabel="Cerrar" />
          </View>

          <Field
            label="Buscar"
            icon="search"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Nombre o correo"
            autoCapitalize="none"
            className="mx-5"
          />

          <View className="flex-1 pt-3">
            <DataLoader
              query={availableStudentsQuery}
              emptyMessage="No hay estudiantes disponibles para asignar a este curso."
            >
              {() =>
                filteredStudents.length === 0 ? (
                  <AppText tone="faint" className="px-5 pt-8 text-center text-[14.5px]">
                    No se encontraron estudiantes con esa búsqueda.
                  </AppText>
                ) : (
                  <FlatList
                    data={filteredStudents}
                    keyExtractor={(item) => item.id}
                    contentContainerClassName="gap-2 px-3 pb-3"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => {
                      const isSelected = selectedStudent === item.id;
                      return (
                        <Pressable
                          onPress={() => setSelectedStudent(item.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: isSelected }}
                          className={`flex-row items-center gap-3 rounded-2xl border-[1.5px] bg-surface px-3.5 py-3 ${
                            isSelected ? "border-ink" : "border-surface"
                          }`}
                        >
                          <Avatar name={item.name} lastName={item.lastName} tone={isSelected ? "dark" : "soft"} />
                          <View className="flex-1">
                            <AppText variant="bold" className="text-[15px]" numberOfLines={1}>
                              {`${item.name} ${item.lastName}`}
                            </AppText>
                            <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
                              {item.email}
                            </AppText>
                          </View>
                          {isSelected && <Ionicons name="checkmark-circle" size={24} color={palette.ink} />}
                        </Pressable>
                      );
                    }}
                  />
                )
              }
            </DataLoader>
          </View>

          <View className="border-t border-line px-4 pt-3">
            <Button
              label="Asignar al curso"
              icon="person-add-outline"
              onPress={handleAssignStudent}
              loading={manualEnrollment.isPending}
              disabled={!selectedStudent}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
