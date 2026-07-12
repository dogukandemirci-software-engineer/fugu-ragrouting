output "documents_bucket_name" {
  value = aws_s3_bucket.documents.bucket
}

output "fugu_ec2_role_arn" {
  value = aws_iam_role.fugu_ec2_role.arn
}

output "fugu_ec2_instance_profile_name" {
  value = aws_iam_instance_profile.fugu_ec2_profile.name
}
