import { useState } from "react";

type Props = {
  apiKey: string | null;
  onSave: (value: string) => Promise<void> | void;
  onClear: () => Promise<void> | void;
  loading?: boolean;
};

export function ApiKeyManager({ apiKey, onSave, onClear, loading }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const maskedKey = apiKey ? `•••• ${apiKey.slice(-4)}` : "No key saved";

  const handleEdit = () => {
    setValue(apiKey ?? "");
    setEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
    setStatus("idle");
  };

  const handleSave = async () => {
    if (!value.trim()) {
      setError("Please paste a valid key.");
      return;
    }
    try {
      setStatus("saving");
      await onSave(value.trim());
      setStatus("saved");
      setEditing(false);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setError("Failed to store key. Try again.");
    }
  };

  const handleClear = async () => {
    await onClear();
    setEditing(false);
    setValue("");
    setStatus("idle");
  };

  return (
    <div className="api-key-card">
      <div className="api-key-header">
        <div>
          <p className="panel-label">OpenAI API key</p>
          {loading ? <span className="muted">Loading…</span> : <strong>{maskedKey}</strong>}
          <p className="api-key-hint">Stored only on this device (local storage / iOS Keychain) and sent directly to OpenAI for your moves.</p>
        </div>
        {!editing ? (
          <div className="api-key-actions">
            <button className="secondary-btn" onClick={handleEdit} disabled={loading}>
              {apiKey ? "Update" : "Add key"}
            </button>
            {apiKey && (
              <button className="text-btn" onClick={handleClear} disabled={loading}>
                Remove
              </button>
            )}
          </div>
        ) : null}
      </div>

      {editing && (
        <div className="api-key-editor">
          <input
            type="password"
            className="api-key-input"
            value={value}
            placeholder="sk-..."
            onChange={(event) => setValue(event.target.value)}
            autoFocus
          />
          {error && <p className="error-text">{error}</p>}
          <div className="api-key-actions">
            <button className="primary-btn" onClick={handleSave} disabled={status === "saving"}>
              {status === "saving" ? "Saving…" : "Save"}
            </button>
            <button className="secondary-btn" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
