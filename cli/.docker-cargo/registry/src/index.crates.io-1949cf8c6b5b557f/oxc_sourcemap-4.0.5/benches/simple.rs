use criterion::{Criterion, criterion_group, criterion_main};
use oxc_sourcemap::{SourceMap, SourceMapBuilder};

pub fn bench(c: &mut Criterion) {
    let input = r#"{
        "version": 3,
        "sources": ["coolstuff.js"],
        "sourceRoot": "x",
        "names": ["x","alert"],
        "mappings": "AAAA,GAAIA,GAAI,EACR,IAAIA,GAAK,EAAG,CACVC,MAAM",
        "x_google_ignoreList": [0],
        "sourcesContent": ["var x = 1;\nif (x == 2) {\n  alert('test');\n}"]
    }"#;

    c.bench_function("SourceMap::from_json_string", |b| {
        b.iter(|| SourceMap::from_json_string(input).unwrap());
    });

    c.bench_function("SourceMap::to_json", |b| {
        let sm = SourceMap::from_json_string(input).unwrap();
        b.iter(|| sm.to_json());
    });

    c.bench_function("SourceMap::to_json_string", |b| {
        let sm = SourceMap::from_json_string(input).unwrap();
        b.iter(|| sm.to_json_string());
    });

    c.bench_function("SourceMapBuilder::add_name_add_source_and_content", |b| {
        let mut builder = SourceMapBuilder::default();
        b.iter(|| {
            builder.add_name("foo");
            builder.add_source_and_content("test.js", "var x = 1;");
        });
    });
}

criterion_group!(sourcemap, bench);
criterion_main!(sourcemap);
