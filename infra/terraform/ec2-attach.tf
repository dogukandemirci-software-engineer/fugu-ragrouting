# Attaches the IAM instance profile to the existing, manually-created EC2
# instance via the AWS CLI (no `aws_instance` resource for this instance
# exists in this config — deliberately, since Terraform "owning" and diffing
# a live instance risks a forced replacement that would destroy the running
# Postgres/Redis/Redpanda data volumes). The AWS provider has no resource
# that associates a profile with an instance it doesn't otherwise manage, so
# a local-exec call to `aws ec2 associate-iam-instance-profile` is the
# correct, minimal-blast-radius approach here.
resource "null_resource" "attach_instance_profile" {
  triggers = {
    instance_id         = var.ec2_instance_id
    instance_profile_arn = aws_iam_instance_profile.fugu_ec2_profile.arn
  }

  provisioner "local-exec" {
    command     = "aws ec2 associate-iam-instance-profile --instance-id ${var.ec2_instance_id} --iam-instance-profile Arn=${aws_iam_instance_profile.fugu_ec2_profile.arn} --region ${var.aws_region}"
    interpreter = ["bash", "-c"]
    environment = {
      AWS_ACCESS_KEY_ID     = var.aws_access_key
      AWS_SECRET_ACCESS_KEY = var.aws_secret_key
    }
  }

  depends_on = [aws_iam_instance_profile.fugu_ec2_profile]
}
