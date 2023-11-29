resource "random_password" "nextauth_secret" {
  length           = 42
  special          = false
}

variable "PROJECT_REPO" {
	type = string
}
variable "EMAIL_HOST" {
  type = string
}
variable "EMAIL_USER" {
  type = string
}
variable "EMAIL_PASSWORD" {
  type = string
}

resource "vercel_project" "main" {
  name            = var.PROJECT_NAME
  framework       = "nextjs"
  git_repository  = {
    type = "github"
    repo = var.PROJECT_REPO
  }
  environment = [
    {
      target = ["preview", "production"]
			key   = "NODE_ENV"
      value = "production"
    },
    {
      target = ["preview", "production"]
			key   = "DATABASE_URL"
      value = local.database_url
    },
    {
      target = ["preview", "production"]
      key = "PROJECT_NAME"
      value = var.PROJECT_NAME
    },
    {
      target = ["preview", "production"]
      key = "NEXT_PUBLIC_MONDAY_URL"
      value = var.MONDAY_URL
    },
    {
      target = ["preview", "production"]
      key = "EMAIL_HOST"
      value = var.EMAIL_HOST
    },
    {
      target = [ "preview", "production" ]
      key = "EMAIL_USER"
      value = var.EMAIL_USER
    },
    {
      target = [ "preview", "production" ]
      key = "EMAIL_PASSWORD"
      value = var.EMAIL_PASSWORD
    }
  ]
}

resource "vercel_deployment" "main" {
  project_id = vercel_project.main.id
  ref        = "master"
  production = false
}