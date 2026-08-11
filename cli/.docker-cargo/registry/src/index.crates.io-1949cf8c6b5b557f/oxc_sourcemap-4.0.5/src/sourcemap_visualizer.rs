use std::borrow::Cow;

use crate::SourceMap;

/// The `SourcemapVisualizer` is a helper for sourcemap testing.
/// It print the mapping of original content and final content tokens.
pub struct SourcemapVisualizer<'a> {
    output: &'a str,
    sourcemap: &'a SourceMap,
}

impl<'a> SourcemapVisualizer<'a> {
    pub fn new(output: &'a str, sourcemap: &'a SourceMap) -> Self {
        Self { output, sourcemap }
    }

    pub fn into_visualizer_text(self) -> String {
        let mut s = String::new();
        let source_contents = &self.sourcemap.source_contents;
        if self.sourcemap.source_contents.is_empty() {
            s.push_str("[no source contents]\n");
            return s;
        }

        let source_contents_lines_map: Vec<Vec<Vec<u16>>> = source_contents
            .iter()
            .filter_map(|content| {
                let content = content.as_ref()?;
                Some(Self::generate_line_utf16_tables(content))
            })
            .collect();

        let output_lines = Self::generate_line_utf16_tables(self.output);

        let tokens = &self.sourcemap.tokens;

        let mut last_source: Option<&str> = None;
        for i in 0..tokens.len() {
            let t = &tokens[i];
            let Some(source_id) = t.get_source_id() else {
                continue;
            };
            let Some(source) = self.sourcemap.get_source(source_id) else { continue };
            let source_lines = &source_contents_lines_map[source_id as usize];

            // Print source
            if last_source != Some(source) {
                s.push('-');
                s.push(' ');
                s.push_str(source);
                s.push('\n');
                last_source = Some(source);
            }

            // validate token position
            let dst_invalid = t.dst_line as usize >= output_lines.len()
                || (t.dst_col as usize) >= output_lines[t.dst_line as usize].len();
            let src_invalid = t.src_line as usize >= source_lines.len()
                || (t.src_col as usize) >= source_lines[t.src_line as usize].len();
            if dst_invalid || src_invalid {
                s.push_str(&format!(
                    "({}:{}){} --> ({}:{}){}\n",
                    t.src_line,
                    t.src_col,
                    if src_invalid { " [invalid]" } else { "" },
                    t.dst_line,
                    t.dst_col,
                    if dst_invalid { " [invalid]" } else { "" },
                ));
                continue;
            }

            // find next dst column or EOL
            let dst_end_col = {
                match tokens.get(i + 1) {
                    Some(t2) if t2.dst_line == t.dst_line => t2.dst_col,
                    _ => output_lines[t.dst_line as usize].len() as u32,
                }
            };

            // find next src column or EOL
            let src_end_col = 'result: {
                for t2 in &tokens[i + 1..] {
                    if t2.get_source_id() == t.get_source_id() && t2.src_line == t.src_line {
                        // skip duplicate or backward
                        if t2.src_col <= t.src_col {
                            continue;
                        }
                        break 'result t2.src_col;
                    }
                    break;
                }
                source_lines[t.src_line as usize].len() as u32
            };

            s.push_str(&format!(
                "({}:{}) {:?} --> ({}:{}) {:?}\n",
                t.src_line,
                t.src_col,
                Self::str_slice_by_token(source_lines, t.src_line, t.src_col, src_end_col),
                t.dst_line,
                t.dst_col,
                Self::str_slice_by_token(&output_lines, t.dst_line, t.dst_col, dst_end_col)
            ));
        }

        s
    }

    fn generate_line_utf16_tables(content: &str) -> Vec<Vec<u16>> {
        let mut tables = vec![];
        let mut line_byte_offset = 0;
        for (i, ch) in content.char_indices() {
            match ch {
                '\r' | '\n' | '\u{2028}' | '\u{2029}' => {
                    // Handle Windows-specific "\r\n" newlines
                    if ch == '\r' && content.chars().nth(i + 1) == Some('\n') {
                        continue;
                    }
                    tables.push(content[line_byte_offset..=i].encode_utf16().collect::<Vec<_>>());
                    line_byte_offset = i + 1;
                }
                _ => {}
            }
        }
        tables.push(content[line_byte_offset..].encode_utf16().collect::<Vec<_>>());
        tables
    }

    fn str_slice_by_token(buff: &[Vec<u16>], line: u32, start: u32, end: u32) -> Cow<'_, str> {
        let line = line as usize;
        let start = start as usize;
        let end = end as usize;
        let s = &buff[line];
        String::from_utf16(&s[start.min(end).min(s.len())..start.max(end).min(s.len())])
            .unwrap()
            .replace("\r", "")
            .into()
    }
}
