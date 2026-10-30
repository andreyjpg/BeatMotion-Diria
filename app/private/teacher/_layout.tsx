import { Stack } from "expo-router";
import React from "react";

export default function TeacherLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="/admin/coursesMenu"
        options={{ title: "Cursos", headerShown: false }}
      />
    </Stack>
  );
}
