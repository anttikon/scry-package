provider "aws" {
  region = "eu-north-1"
}

resource "aws_s3_bucket" "bucket" {
  bucket = "scry-package"
  acl = "public-read"
  versioning {
    enabled = false
  }
  tags {
    Name = "scry-package-bucket"
  }
}
