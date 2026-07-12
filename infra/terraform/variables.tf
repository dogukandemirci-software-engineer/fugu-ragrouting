variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "eu-north-1"
}

variable "aws_access_key" {
  description = "Access key for the terraform-admin IAM user (bootstrapping credential, never used by the app itself)"
  type        = string
  sensitive   = true
}

variable "aws_secret_key" {
  description = "Secret key for the terraform-admin IAM user"
  type        = string
  sensitive   = true
}

variable "ec2_instance_id" {
  description = "ID of the existing, manually-created EC2 instance running the FUGU stack (Postgres/Redis/Redpanda/backend/frontend). Never managed as a full Terraform resource — only has an IAM instance profile attached to it."
  type        = string
  default     = "i-093d043287d8b99ae"
}
