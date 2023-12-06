provider "aws" {
  region = "us-east-1"
}
data "aws_vpc" "default" {
  default = true
}
data "aws_subnet_ids" "default" {
  vpc_id = data.aws_vpc.default.id
}

# CONFIG VARIABLES
variable "AMI_ID" {
  type = string
  default = "ami-0147d6c06e790d07b"
}
variable "SERVER_DOMAIN" {
	type = string
}
variable "EC2_KEY_PAIR" {
	type = string
}

# ENV VARIABLES
variable "CONTAINER_NAME" {
  type = string
}
variable "CONTAINER_PORT" {
  type = string
}
variable "DOCKER_USER" {
  type = string
}
variable "DOCKER_PASSWORD" {
  type = string
}

# SERVER VARIABLES
variable "CLIENT_URL" {
  type = string
}
variable "MEDIA_BASE_URL" {
  type = string
}
variable "META_APP_SECRET" {
  type = string
}
variable "META_ACCESS_TOKEN" {
  type = string
}
variable "WHATSAPP_BUSINESS_ID" {
  type = string
}
variable "WHATSAPP_API_TOKEN" {
  type = string
}
variable "WHATSAPP_PHONE_ID" {
  type = string
}
variable "WHATSAPP_VERIFY_TOKEN" {
  type = string
}
variable "GOOGLE_CLOUD_API_KEY" {
  type = string
}
variable "OPENAI_API_KEY" {
  type = string
}

resource "aws_instance" "automation_server" {
  ami                    = var.AMI_ID
  instance_type          = "t3.micro"
  key_name               = var.EC2_KEY_PAIR
  security_groups        = [aws_security_group.automation_server_sg.name]
  user_data = <<-EOF
              #!/bin/bash
              docker login --username ${var.DOCKER_USER} --password ${var.DOCKER_PASSWORD}
              docker pull ${var.DOCKER_USER}/${var.CONTAINER_NAME}:latest

              if [ \$(docker container ls -q -f name=${var.CONTAINER_NAME}) != '' ]; then
                docker container stop ${var.CONTAINER_NAME}
                docker container rm ${var.CONTAINER_NAME}
              fi

              docker run -d --name ${var.CONTAINER_NAME} -p ${var.CONTAINER_PORT}:${var.CONTAINER_PORT} \
                -e CLIENT_URL=${var.CLIENT_URL} \
                -e MEDIA_BASE_URL=${var.MEDIA_BASE_URL} \
                -e META_APP_SECRET=${var.META_APP_SECRET} \
                -e META_ACCESS_TOKEN=${var.META_ACCESS_TOKEN} \
                -e WHATSAPP_BUSINESS_ID=${var.WHATSAPP_BUSINESS_ID} \
                -e WHATSAPP_API_TOKEN=${var.WHATSAPP_API_TOKEN} \
                -e WHATSAPP_PHONE_ID=${var.WHATSAPP_PHONE_ID} \
                -e WHATSAPP_VERIFY_TOKEN=${var.WHATSAPP_VERIFY_TOKEN} \
                -e GOOGLE_CLOUD_API_KEY=${var.GOOGLE_CLOUD_API_KEY} \
                -e OPENAI_API_KEY=${var.OPENAI_API_KEY} \
                ${var.DOCKER_USER}/${var.CONTAINER_NAME}:latest
              EOF
  tags = {
    Name = "${var.PROJECT_NAME}-automation-server"
  }
}

resource "aws_security_group" "automation_server_sg" {
  name        = "${var.PROJECT_NAME}-automation-server"
  description = "Security group for API server"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_acm_certificate" "automation_server_cert" {
  domain_name       = var.SERVER_DOMAIN
  validation_method = "DNS"

  tags = {
    Name = "${var.PROJECT_NAME}-automation-server-cert"
  }
}

resource "aws_acm_certificate_validation" "automation_server_cert" {
  certificate_arn         = aws_acm_certificate.automation_server_cert.arn
  validation_record_fqdns = [aws_route53_record.automation_server_cert_validation.fqdn]
}

resource "aws_route53_record" "automation_server_cert_validation" {
  name    = aws_acm_certificate.automation_server_cert.domain_validation_options.0.resource_record_name
  type    = aws_acm_certificate.automation_server_cert.domain_validation_options.0.resource_record_type
  zone_id = aws_route53_zone.primary.zone_id
  records = [aws_acm_certificate.automation_server_cert.domain_validation_options.0.resource_record_value]
  ttl     = 60
}



resource "aws_elb" "automation_server_elb" {
  name               = "${var.PROJECT_NAME}-automation-server-elb"
  subnets            = data.aws_subnet_ids.default.ids
  security_groups    = [aws_security_group.automation_server_sg.id]

  listener {
    instance_port     = 80
    instance_protocol = "HTTP"
    lb_port           = 443
    lb_protocol       = "HTTPS"
    ssl_certificate_id = aws_acm_certificate.automation_server_cert.arn
  }

  health_check {
    target              = "HTTP:80/"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  instances                   = [aws_instance.automation_server.id]
}

resource "aws_route53_record" "automation_server_dns" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.SERVER_DOMAIN
  type    = "A"

  alias {
    name                   = aws_elb.automation_server_elb.dns_name
    zone_id                = aws_elb.automation_server_elb.zone_id
    evaluate_target_health = true
  }
}
