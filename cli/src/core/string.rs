pub(crate) fn split_preserve_spaces(input: &str) -> Vec<String> {
    let mut result = Vec::new();
    let mut current = String::new();

    for c in input.chars() {
        if c == ' ' {
            if !current.is_empty() {
                result.push(current.clone());
                current.clear();
            }
            result.push(" ".to_string());
        } else {
            current.push(c);
        }
    }

    if !current.is_empty() {
        result.push(current);
    }

    result
}

pub(crate) fn short_circuit_replacement(
    content: &str,
    replacements: &[(String, String)],
) -> String {
    split_preserve_spaces(content)
        .iter()
        .map(|word| {
            for (existing, new) in replacements {
                if word.contains(existing) {
                    return word.replace(existing, new);
                }
            }
            word.to_string()
        })
        .collect::<Vec<_>>()
        .join("")
}
