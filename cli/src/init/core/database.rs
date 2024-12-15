pub(crate) fn match_database(database: &str) -> String {
    match database {
        "mongodb" => "MongoDriver".to_string(),
        "postgresql" => "PostgreSqlDriver".to_string(),
        "sqlite" => "SqliteDriver".to_string(),
        "mysql" => "MySqlDriver".to_string(),
        _ => "PostgreSqlDriver".to_string(),
    }
}
