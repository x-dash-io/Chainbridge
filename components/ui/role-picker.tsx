"use client";

import { useState } from "react";
import { ROLES, RoleCard } from "./role-card";

type RolePickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
};

export function RolePicker({ value, onChange, error }: RolePickerProps) {
  const [selected, setSelected] = useState(value ?? "");

  const handleSelect = (roleValue: string) => {
    setSelected(roleValue);
    onChange?.(roleValue);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium leading-none text-foreground">
        Role
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ROLES.map((role) => (
          <RoleCard
            key={role.value}
            role={role}
            selected={selected === role.value}
            interactive
            onSelect={handleSelect}
          />
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
