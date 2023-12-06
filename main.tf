terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.4"
    }
		random = {
			source = "hashicorp/random"
			version = "~> 3.1"
		}
  }
  required_version = ">= 1.2.0"
}

provider "aws" {
  region = "us-east-1"
}

variable "PROJECT_NAME" {
	type = string
  default = "torus-automation"
}
variable "MONDAY_URL" {
  type = string
}


resource "random_password" "db_password" {
  length           = 32
  special          = false
}

resource "aws_security_group" "db" {
  name_prefix = "${var.PROJECT_NAME}-db"
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = {
    Project = var.PROJECT_NAME
  }
}

resource "aws_db_instance" "main" {
  identifier = "${var.PROJECT_NAME}-db"
  allocated_storage            = 10
  db_name                      = var.PROJECT_NAME
  engine                       = "postgres"
  instance_class               = "db.t3.micro"
  username                     = "postgres"
  password                     = random_password.db_password.result
  backup_retention_period      = 30
  publicly_accessible = true
  performance_insights_enabled = true
  skip_final_snapshot = true
  vpc_security_group_ids = [aws_security_group.db.id]
  tags = {
    Project = var.PROJECT_NAME
  }
  provisioner "local-exec" {
    command = "npx prisma db push && npx prisma db seed"
    when = create
  }
}

resource "aws_s3_bucket" "media" {
  bucket = "${var.PROJECT_NAME}-media"
	tags = {
    Project = var.PROJECT_NAME
  }
}

resource "aws_s3_bucket_acl" "media_bucket_acl" {
  bucket = aws_s3_bucket.media.id
  acl    = "public-read"
}

resource "aws_s3_bucket_policy" "media_public_access" {
  bucket = aws_s3_bucket.media.id
  policy = data.aws_iam_policy_document.public_access.json
}

data "aws_iam_policy_document" "public_access" {
  statement {
		sid = "PublicReadGetObject"
		actions = [ "s3:GetObject" ]
    resources = [
      aws_s3_bucket.media.arn,
      "${aws_s3_bucket.media.arn}/*",
    ]
		principals {
      type        = "AWS"
      identifiers = ["*"]
    }
  }
}

resource "aws_iam_user" "s3_admin_user" {
  name = "${var.PROJECT_NAME}-s3-admin-user"
}

resource "aws_iam_access_key" "s3_admin_user_key" {
  user = aws_iam_user.s3_admin_user.name
}

resource "aws_iam_user_policy" "s3_crud_policy" {
  name = "s3-crud-policy"
  user = aws_iam_user.s3_admin_user.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = [
          "${aws_s3_bucket.media.arn}",
          "${aws_s3_bucket.media.arn}/*"
        ]
      }
    ]
  })
}

locals {
  s3_origin_id = "${aws_s3_bucket.media.bucket}-origin"
	database_url = "postgresql://${aws_db_instance.main.username}:${aws_db_instance.main.password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
}

/* resource "aws_cloudfront_origin_access_control" "media_cdn" {
  name                              = "${var.PROJECT_NAME}-media}"
  description                       = "Acces control for ${var.PROJECT_NAME} media cdn"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "media_cdn" {
  origin {
    domain_name              = aws_s3_bucket.media.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.media_cdn.id
    origin_id                = local.s3_origin_id
  }
	
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_All"

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "allow-all"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

	restrictions {
		geo_restriction {
			restriction_type = "none"
		}
	}

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Project     = var.PROJECT_NAME
  }
} */