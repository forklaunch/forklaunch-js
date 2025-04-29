pub(crate) fn validate_name(name: &str) -> bool {
    return !name.is_empty()
        && !name.contains(' ')
        && !name.contains('\t')
        && !name.contains('\n')
        && !name.contains('\r')
        && !name
            .chars()
            .any(|c| !c.is_ascii_alphanumeric() && c != '_' && c != '-');
}
