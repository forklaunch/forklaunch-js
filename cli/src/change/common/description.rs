use serde_json::Value;

pub(crate) fn change_description(description: &str, application_json_to_write: &mut Value) {
    application_json_to_write["description"] = Value::String(description.to_string());
}
