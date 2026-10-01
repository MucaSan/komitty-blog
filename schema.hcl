schema "public" {}

table "users" {
  schema = schema.public
  column "id" {
    type = uuid
    null = false
  }
  column "username" {
    type = text
    null = false
  }
  column "password_hash" {
    type = text
    null = false
  }
  column "is_prime" {
    type    = boolean
    null    = false
    default = false
  }
  column "created_at" {
    type = timestamptz
    null = false
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  unique "users_username_key" {
    columns = [column.username]
  }
}

table "posts" {
  schema = schema.public
  column "id" {
    type = uuid
    null = false
  }
  column "user_id" {
    type = uuid
    null = false
  }
  column "title" {
    type = text
    null = false
  }
  column "content" {
    type = text
    null = false
  }
  column "created_at" {
    type = timestamptz
    null = false
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "posts_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_delete   = CASCADE
  }
  index "posts_user_id_idx" {
    columns = [column.user_id]
  }
  index "posts_created_at_idx" {
    columns = [column.created_at]
  }
}
