# Atlas project configuration.
#
# Local usage:
#   export DATABASE_URL="postgres://komitty:komitty@localhost:5432/komitty?sslmode=disable"
#   atlas migrate apply --env local          # apply all pending migrations
#   atlas migrate diff add_some_column --env local   # generate a new migration from a diff
#
# `diff` requires a disposable "dev" database; see the `dev` env below.

env "local" {
  url = getenv("DATABASE_URL")
  migration {
    dir = "file://migrations"
  }
}

env "dev" {
  # Throwaway database Atlas uses to plan/replay migrations during `diff`.
  url = "docker://postgres/16/dev"
}
