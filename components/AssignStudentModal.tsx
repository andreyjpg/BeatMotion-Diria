import DataLoader from "@/components/DataLoader";
import { useAvailableStudents } from "@/hooks/enrollment/useAvailableStudents";
import { useManualEnrollment } from "@/hooks/enrollment/useManualEnrollment";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type AssignStudentModalProps = {
  visible: boolean;
  courseId: string;
  courseName: string;
  onClose: () => void;
};

export default function AssignStudentModal({
  visible,
  courseId,
  courseName,
  onClose,
}: AssignStudentModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const availableStudentsQuery = useAvailableStudents(courseId);
  const manualEnrollment = useManualEnrollment();

  const filteredStudents =
    availableStudentsQuery.data?.filter((student) => {
      const fullName =
        `${student.name} ${student.lastName} ${student.email}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    }) ?? [];

  const handleAssignStudent = async () => {
    if (!selectedStudent) return;

    try {
      await manualEnrollment.mutateAsync({
        userId: selectedStudent,
        courseId,
      });

      setSelectedStudent(null);
      setSearchQuery("");
      onClose();
    } catch {
      // useManualEnrollment already showed the error.
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-gray-950 rounded-t-3xl h-4/5 pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between p-6 border-b border-gray-800">
            <View className="flex-1">
              <Text className="text-white text-xl font-bold">
                Asignar Estudiante
              </Text>
              <Text className="text-gray-400 text-sm mt-1">{courseName}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-gray-800 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="px-6 py-4">
            <View className="bg-gray-900 rounded-2xl px-4 py-3 flex-row items-center">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-2 text-white"
                placeholder="Buscar por nombre o correo..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Students List */}
          <View className="flex-1 px-6">
            <DataLoader
              query={availableStudentsQuery}
              emptyMessage="No hay estudiantes disponibles para asignar a este curso."
            >
              {() => (
                <>
                  {filteredStudents.length === 0 ? (
                    <View className="flex-1 items-center justify-center">
                      <Ionicons
                        name="search-outline"
                        size={48}
                        color="#4b5563"
                      />
                      <Text className="text-gray-400 mt-4">
                        No se encontraron estudiantes con ese criterio
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={filteredStudents}
                      keyExtractor={(item) => item.id}
                      showsVerticalScrollIndicator={false}
                      renderItem={({ item }) => {
                        const isSelected = selectedStudent === item.id;
                        return (
                          <Pressable
                            className={`bg-gray-900 rounded-2xl p-4 mb-3 flex-row items-center ${
                              isSelected ? "border-2 border-primary" : ""
                            }`}
                            onPress={() => setSelectedStudent(item.id)}
                          >
                            {/* Avatar */}
                            <View
                              className={`w-12 h-12 rounded-full items-center justify-center ${
                                isSelected ? "bg-primary" : "bg-gray-800"
                              }`}
                            >
                              <Text
                                className={`text-lg font-bold ${
                                  isSelected ? "text-black" : "text-white"
                                }`}
                              >
                                {item.name?.[0]?.toUpperCase()}
                                {item.lastName?.[0]?.toUpperCase()}
                              </Text>
                            </View>

                            {/* Info */}
                            <View className="flex-1 ml-4">
                              <Text className="text-white font-semibold">
                                {item.name} {item.lastName}
                              </Text>
                              <Text className="text-gray-400 text-sm">
                                {item.email}
                              </Text>
                              {item.phone && (
                                <Text className="text-gray-500 text-xs mt-1">
                                  📱 {item.phone}
                                </Text>
                              )}
                            </View>

                            {/* Checkmark */}
                            {isSelected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={28}
                                color="#40E0D0"
                              />
                            )}
                          </Pressable>
                        );
                      }}
                    />
                  )}
                </>
              )}
            </DataLoader>
          </View>

          {/* Action Buttons */}
          <View className="px-6 pt-4 border-t border-gray-800">
            <TouchableOpacity
              className={`rounded-2xl py-4 items-center flex-row justify-center gap-2 ${
                selectedStudent && !manualEnrollment.isPending
                  ? "bg-primary"
                  : "bg-gray-800"
              }`}
              onPress={handleAssignStudent}
              disabled={!selectedStudent || manualEnrollment.isPending}
            >
              {manualEnrollment.isPending ? (
                <>
                  <ActivityIndicator color="#000000" />
                  <Text className="text-black font-semibold ml-2">
                    Asignando...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="person-add" size={20} color="#000000" />
                  <Text className="text-black font-semibold">
                    Asignar al Curso
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-gray-800 rounded-2xl py-3 mt-3"
              onPress={onClose}
              disabled={manualEnrollment.isPending}
            >
              <Text className="text-center text-white font-semibold">
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
