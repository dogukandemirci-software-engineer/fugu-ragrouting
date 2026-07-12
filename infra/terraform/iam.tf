data "aws_caller_identity" "current" {}

resource "aws_iam_role" "fugu_ec2_role" {
  name = "fugu-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# Bedrock Titan v2 embeddings are the platform-wide default embedding path
# (not BYOK) — scoped to InvokeModel on the specific foundation model only.
# Both eu-north-1 and eu-west-1 are allowed: eu-north-1 (the EC2/S3 region)
# throttled every request on this account even at wide intervals, so the
# app falls back to invoking the model in eu-west-1 instead (see
# bedrockClient in embedding.service.ts).
resource "aws_iam_role_policy" "bedrock_invoke" {
  name = "fugu-bedrock-invoke"
  role = aws_iam_role.fugu_ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "bedrock:InvokeModel"
        Resource = [
          "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v2:0",
          "arn:aws:bedrock:eu-west-1::foundation-model/amazon.titan-embed-text-v2:0",
        ]
      }
    ]
  })
}

# Least-privilege access to the new documents bucket only — new uploads only,
# existing local-disk documents are untouched by this migration.
resource "aws_iam_role_policy" "s3_documents" {
  name = "fugu-s3-documents"
  role = aws_iam_role.fugu_ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
        ]
        Resource = "${aws_s3_bucket.documents.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.documents.arn
      }
    ]
  })
}

resource "aws_iam_instance_profile" "fugu_ec2_profile" {
  name = "fugu-ec2-profile"
  role = aws_iam_role.fugu_ec2_role.name
}
