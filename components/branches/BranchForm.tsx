import Card from "@/components/ui/Card";
import Field from "@/components/ui/Field";
import FormActions from "@/components/ui/FormActions";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { branchFormSchema, FormErrors, validationErrors } from "@/constants/validationForms";
import { useState } from "react";

type BranchValues = { name: string; location: string };

type BranchFormProps = {
  heading: string;
  /** The branch being edited; without it the form creates a new one. */
  initial?: BranchValues;
  saveLabel: string;
  saving: boolean;
  onSave: (values: BranchValues) => void;
};

/** The branch form, for creating and for editing. */
const BranchForm = ({ heading, initial, saveLabel, saving, onSave }: BranchFormProps) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [errors, setErrors] = useState<FormErrors<typeof branchFormSchema>>({});

  const save = () => {
    const found = validationErrors(branchFormSchema, { name, location });
    setErrors(found);
    if (Object.keys(found).length === 0) onSave({ name: name.trim(), location: location.trim() });
  };

  return (
    <Screen form footer={<FormActions saveLabel={saveLabel} onSave={save} loading={saving} />}>
      <ScreenHeader nav="close" eyebrow="Sucursales" title={heading} subtitle="Los dos campos son obligatorios." />
      <Card className="mx-3 mt-4 gap-3.5">
        <Field label="Nombre *" value={name} onChangeText={setName} placeholder="Sede Centro" error={errors.name} />
        <Field
          label="Ubicación *"
          value={location}
          onChangeText={setLocation}
          placeholder="Dirección o descripción de la ubicación"
          multiline
          error={errors.location}
        />
      </Card>
    </Screen>
  );
};

export default BranchForm;
