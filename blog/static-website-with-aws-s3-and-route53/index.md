This article covers hosting a static website using S3 and Route 53. I'll assume you already have an AWS account, but no further experience with AWS services is required as each step will be explained, with links to more detailed documentation where appropriate. We'll stray off the "happy path", make a few "mistakes" along the way and use some cool tools to understand and fix them. Some knowledge of basic HTTP concepts and shell usage is assumed. 

There are many similar tutorials on the internet, mostly using the web interface (the [AWS Management Console](https://aws.amazon.com/console/) - MC for short). Personally I prefer CLIs and would like to avoid the indignity of clicking around in GUIs - so we'll mostly stick with the [AWS CLI](https://aws.amazon.com/cli/). Occasionally it is useful to check the MC as well, so some relevant links are provided but I didn't include any screenshots as they tend to become outdated very quickly.

I'll be using [git bash](https://gitforwindows.org/) on Windows, but the commands should be portable to other shells and operating systems.

## Setup AWS CLI

The first step is to install the AWS CLI; it's a Python package and can be installed with `pip`:
```
$ pip install awscli
```

## Initial User Setup

When you sign up for an AWS account, you'll be able to login to the MC using your email and a password. These are the MC credentials for the _root_ user, created implicitly with your account. However, Amazon [recommends](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#lock-away-credentials) is that you avoid using the root user as much as possible - instead, we're going to use the IAM Management Console to create an IAM user. Any number of such users can be created; in addition, we can also create [groups](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups.html) and [policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html) which can be used to organize users, and limit their access to the accounts various AWS services and resources.

So log in with you root user, head over to the [IAM Management Console](https://console.aws.amazon.com/iam/home), create a group named "Admins" and assign the [`AdministratorAccess`](https://console.aws.amazon.com/iam/home#/policies/arn:aws:iam::aws:policy/AdministratorAccess$jsonEditor) policy to it. IAM policies are defined using a [special JSON syntax](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_grammar.html); `AdministratorAccess` is one of the built-in, AWS-managed policies, and it has the following definition:

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "*",
            "Resource": "*"
        }
    ]
}
```

Which might seem pointless, as even without knowing the details of the JSON syntax, you can tell it's quite permissive and seems to allow everything - therefore defeating the purpose of creating a non-root user. However, not everything can be expressed using policies and because anything that is not explicitly allowed is disallowed, [things that cannot be expressed in policies](https://docs.aws.amazon.com/general/latest/gr/aws_tasks-that-require-root.html) are only accessible to the root user.

Once the "Admins" group is setup, create a user (let's say, john.smith) and add it to the group - it will automatically have all the groups policies applied to it. When creating the user, you can choose what type of access it requires - CLI, MC or both; make sure the CLI checkbox is ticked as we'll use this user going forward. On the final user creation screen, AWS will let you know the user was successfully created and that it generated credentials for it, which can be downloaded in the form of a CSV file that would look like this:

```csv
User name,Password,Access key ID,Secret access key,Console login link
john.smith,a+D2xDr-cbLT,AKIAIOSFODNN7EXAMPLE,wJalrXUtnFEMIxK7MDENGXbPxRfiCYzEXAMPLEKEY,https://123456789012.signin.aws.amazon.com/console
```

It contains two sets of credentials - assuming both MC and CLI checkboxes were ticked. Below, I've listed them in a more readable fashion, and annotated each line with the access type it is associated with:

- MC - User name: john.smith
- MC - Password: a+D2xDr-cbLT
- MC - Console login link: https://123456789012.signin.aws.amazon.com/console
- CLI - Access key ID: AKIAIOSFODNN7EXAMPLE
- CLI - Secret access key: wJalrXUtnFEMIxK7MDENGXbPxRfiCYzEXAMPLEKEY

The MC credentials consist of three fields; the "Console login link" is a URL where you can go and use the user name and the password to login to the MC as the newly created admin user - rather than as the root user. The "Access key ID" and "Secret access key" fields are specific to the CLI access type.

The credentials are only displayed on the final user creation screen, where you also have the "Download .csv" button. Once you close that screen, the secret access key and the password won't be displayed again. However, not all is lost if you forget them because you can easily set a new password (as the root or admin user) or create a new access key pair - and remove/disable the old one. By the way, don't forget to [remove/disable the root users key pair](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#lock-away-credentials) - this will disable programmatic access as the root user, but not logging in with the username and password.

## Configuring the CLI

Once we have a user and CLI credentials, we need to configure the CLI to use them. Like many other CLI tools, the AWS CLI will read in a couple of configuration files (["dotfiles"](https://www.cyberciti.biz/faq/explain-linux-unix-dot-files/)) on each run. These are `~/.aws/config` and `~/.aws/credentials`; they resemble [INI](https://en.wikipedia.org/wiki/INI_file) files and have "sections"; each section is a ["profile"](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html) which generally is either a user name, or "default". The CLI will read only one section from each file, the one corresponding to the profile being used. As you would imagine, the contents of the "default" profile are used when you don't specify another one, which you can do using the [`--profile`](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-options.html) CLI option or the [AWS_PROFILE environment variable](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html).

These files can be edited manually, or by running the `aws configure` command; they should look as below.

```
$ cat ~/.aws/credentials
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMIxK7MDENGXbPxRfiCYzEXAMPLEKEY

$ cat ~/.aws/config
[default]
region = eu-west-1
output = json
```

## Create a Website

Let's create a very simple website, with an index (home) page and another page available on the `/blog/first-post` route. The home page will reference a CSS stylesheet, and the nested one (the blog post) will reference the same stylesheet, and an image. We'll be taking advantage of the fact that we can express this type of simple route layout using the filesystem. Here is a [simple Bash script](https://gist.github.com/mrotaru/ce37fd41ce7270f27d6189d3127261b7) which will create a file tree as outlined below.

```
├─ blog/
│  └─ first-post/
|      ├─ index.html
│      └─ image.svg
├─ index.html
└─ style.css
```


## Setup S3 Bucket

The website is sorted, now we need to upload it somewhere - so let's create an [S3 bucket](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingBucket.html) and set it up as a website host. The AWS CLI actually comes with [two sub-commands for dealing with S3 - `s3` and `s3api`](https://docs.aws.amazon.com/cli/latest/userguide/cli-services-s3.html); `s3` offers a higher level of abstraction, whereas `s3api` is lower level and more powerful - similar to how `git` divides its commands into "porcelain" and "plumbing". We'll be using mostly "porcelain" `s3` commands.

The name of the bucket doesn't really matter, but it has to be _globally_ unique - that is, unique across all AWS accounts, not just your; and since I'm going to name my bucket "glorious-website", you'll have to name yours something else.

```sh
$ aws s3 mb s3://glorious-website # create the bucket
make_bucket: glorious-website

$ aws s3 ls # verify the bucket was created
2020-02-03 08:57:12 glorious-website

$ cd ~/code/glorious-website # change to the folder with the website

$ aws s3 sync . s3://glorious-website --dryrun # do a "dry run" first ...
(dryrun) upload: .git\COMMIT_EDITMSG to s3://glorious-website/.git/COMMIT_EDITMSG
(dryrun) upload: .git\HEAD to s3://glorious-website/.git/HEAD
(dryrun) upload: .git\config to s3://glorious-website/.git/config
(dryrun) upload: blog\first-post\image.svg to s3://glorious-website/blog/first-post/image.svg
(dryrun) upload: blog\first-post\index.html to s3://glorious-website/blog/first-post/index.html
(dryrun) upload: .\index.html to s3://glorious-website/index.html
(dryrun) upload: .\style.css to s3://glorious-website/style.css

$ aws s3 sync . s3://glorious-website --exclude ".git/*" --dryrun # ... make adjustments, if necessary
(dryrun) upload: blog\first-post\image.svg to s3://glorious-website/blog/first-post/image.svg
(dryrun) upload: blog\first-post\index.html to s3://glorious-website/blog/first-post/index.html
(dryrun) upload: .\index.html to s3://glorious-website/index.html
(dryrun) upload: .\style.css to s3://glorious-website/style.css

$ aws s3 sync . s3://glorious-website # ... and if dry run looks OK, do it for real
upload: blog\first-post\image.svg to s3://glorious-website/blog/first-post/image.svg
upload: blog\first-post\index.html to s3://glorious-website/blog/first-post/index.html
upload: .\style.css to s3://glorious-website/style.css
upload: .\index.html to s3://glorious-website/index.html
```
Above we used the `mb` command to create a bucket, then `ls` to verify that it was created. Then we uploaded the files with `sync` - but before doing that, we ran the `sync` command with the `--dryrun` flag, supported by many other commands, which tells you what _would_ happen if you ran the command without this flag; useful as a sanity check. In this case it helped to notice that the `.git` folder would have been uploaded as well, which was not intended.

## Make Bucket into Static Website

So the website is now in an S3 bucket - but it's still not accessible as a website; to AWS it's just another bucket with files in it - so we need to tell it that we actually have a website in there. For this we have the aptly named `website` command:

```sh
$ aws s3 website s3://glorious-website --index-document index.html
```
If everything goes OK and the operation is successful, we won't get any output; many other `aws` commands have the same behaviour, adhering to the UNIX tenet of avoiding unnecessary output. Unfortunately this means we don't know the URL where the website is hosted, and apparently we have to use the [S3 MC](https://s3.console.aws.amazon.com) for that as I couldn't find a way of revealing the URL using the command line.

The URL will be something like this: http://glorious-website.s3-website-eu-west-1.amazonaws.com/, and you can see that it follows a predictable format; if you know the bucket name and the region (eu-west-1 in this case), you can deduce the website URL. However, if you open it in your browser, you'll get a "403 Forbidden" page. Of course you can check this in a browser, but below we're using the [`httpie`](https://httpie.org/) tool with the [`--headers` option](https://httpie.org/doc#output-options); it makes a `GET` request to the URL given as a parameter, but only displays the response headers:

```
$ http --headers http://glorious-website.s3-website-eu-west-1.amazonaws.com/
HTTP/1.1 403 Forbidden
Content-Length: 303
Content-Type: text/html; charset=utf-8
Date: Tue, 04 Feb 2020 13:58:38 GMT
Server: AmazonS3
```

The reason for the `403` is that the request didn't contain any authentication information, and by default anonymous access to S3 buckets is disallowed - but for public websites, that's exactly what we need. The way to accomplish this is via [policies](https://docs.aws.amazon.com/AmazonS3/latest/dev/access-policy-language-overview.html) - we need to assign a policy to the bucket which lets AWS know that we're fine with anonymous _read_ access to the contents of this particular bucket.

Let's create a website policy and write it to a JSON file:

```
$ tee ./policy.json <<EOF
{
  "Version":"2012-10-17",
  "Statement":[{
    "Sid":"PublicReadGetObject",
    "Effect":"Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::glorious-website/*"
  }]
}
EOF
```
To apply the policy, we'll have to use an `s3api` "plumbing" command, `put-bucket-policy`:

```
$ aws s3api put-bucket-policy --bucket glorious-website --policy file://policy.json
``` 

Once again, if successful, there will be no output but we'll be able to actually visit the website; let's verify that with `httpie`:

```
$ http --headers http://glorious-website.s3-website-eu-west-1.amazonaws.com/
HTTP/1.1 200 OK
Content-Length: 259
Content-Type: text/html
Date: Tue, 04 Feb 2020 14:10:16 GMT
ETag: "4d5aea333733346209b576265ee4f46f"
Last-Modified: Mon, 03 Feb 2020 21:48:21 GMT
Server: AmazonS3
```

## Setup Domain Name

We have a static website hosted on AWS S3, that we can actually visit - but the URL isn't very user friendly - so we need to register a domain. Even if doing this as a learning exercise, I would suggest registering an actual domain - thanks to the plethora of new <abbr title="Top Level Domain">TLD</abbr>s (there are over 1.5k now) a domain can be registered very cheaply - I registered the `glorious.website` domain with Namecheap for $1.46.

Once a domain is registered, let's use `httpie` and [`dig`](https://en.wikipedia.org/wiki/Dig_(command)) to do understand how things are setup just after registering. The default output of the `dig` command is quite verbose, so the `+noall` option is used to turn everything off, and then `+answer` selectively enables only the "answer" section. I modified the response slightly by adding [column names](https://stackoverflow.com/a/20316852/447661); more on `dig` [here](https://www.cyberciti.biz/faq/linux-unix-dig-command-examples-usage-syntax/).

```
$ http --headers http://glorious.website
HTTP/1.1 302 Found
Connection: keep-alive
Content-Length: 51
Content-Type: text/html; charset=utf-8
Date: Wed, 05 Feb 2020 07:11:17 GMT
Location: http://www.glorious.website/
Server: nginx
X-Served-By: Namecheap URL Forward

$ http --headers http://www.glorious.website
HTTP/1.1 200 OK
Allow: GET, HEAD
Cache-Control: no-cache
Connection: keep-alive
Content-Encoding: gzip
Content-Type: text/html; charset=utf-8
Date: Wed, 05 Feb 2020 07:11:24 GMT
Expires: -1
Pragma: no-cache
Server: namecheap-nginx
Transfer-Encoding: chunked
Vary: Accept-Encoding
X-CST: MISS
X-CST: MISS

$ dig +noall +answer glorious.website
---------------------------------------------------------------------------
NAME                       TTL   CLASS   TYPE    DATA
---------------------------------------------------------------------------
glorious.website.          776   IN      A       192.64.119.240

$ dig +noall +answer www.glorious.website
---------------------------------------------------------------------------
NAME                       TTL   CLASS   TYPE    DATA
---------------------------------------------------------------------------
www.glorious.website.      782   IN      CNAME   parkingpage.namecheap.com.
parkingpage.namecheap.com.  30   IN      A       198.54.117.218
parkingpage.namecheap.com.  30   IN      A       198.54.117.212
parkingpage.namecheap.com.  30   IN      A       198.54.117.211
---------------------------------------------------------------------------
```

From the responses, we can see that these requests are indeed handled by Namecheap. The "www.glorious.website" domain points to a parking page which we can visit, and that the server at the IP of the non-"www" is setup by Namecheap to respond with [a 302 response](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/302). When browsers receive a 302, they read the URL in the `Location` response header and navigate there - so visitors to the root domain will be redirected to the "www" one.

## To www or not to www ?

One of the first things to consider when it comes to domains is the thorny issue of ["www" vs non-www ("naked")](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Choosing_between_www_and_non-www_URLs) - we need to pick one as the "canonical" website URL, and redirect the other one so that both of them resolve to the same canonical URL. Traditionally, the recommendation is to opt for the prefixed version - we won't go into the reasons as to why that is because this rabbit hole goes quite deep but there are [good technical reasons](https://www.yes-www.org/why-use-www/) for high-traffic websites to at least consider going this route.

Using the root domain (also known as the "apex" or "naked" domain) as the canonical URL is the hip and trendy thing to do; lots of people appreciate the shorter URLs and find them more aesthetically pleasing. The "www"-prefixed domain would redirect to the root domain, so both would work. Normally this kind of aliasing would be done via a [`CNAME` DNS record](https://en.wikipedia.org/wiki/CNAME_record). Technically, this is not _disallowed_ for the root domain - but according to [RFC1912](https://tools.ietf.org/html/rfc1912), "a CNAME record is not allowed to coexist with any other data". The main reason this "hurts" is that you generally want email delivery for the domain, sooner or later - and for that you'd need an [`MX` record](https://en.wikipedia.org/wiki/MX_record), which would "coexist" with the `CNAME` record - which is forbidden.

Registrars and DNS providers (these are different services, but they are often offered by the same company) work around this issue in a several ways - by [handling `CNAME` records](https://blog.cloudflare.com/introducing-cname-flattening-rfc-compliant-cnames-at-a-domains-root/) in a custom way, or [introducing new record types](https://stackoverflow.com/a/22659895/447661) - like `ALIAS` or `ANAME`. While there is no standard way of doing this, as of early 2020 most DNS providers have fairly mature solutions for this popular request and, as we'll see, Amazon is no exception. So, we'll go the hipster route and use the shorter, non-www domain for the canonical URL.

## Setup Route 53

With the domain registered, the `glorious.website` domain is "resolved" by Namecheap's DNS servers to an IP address for the server hosting the parking page; this is done via an `A` record. All host names ultimately need to resolve to an IP; so, somehow, we need to make the `glorious.website` domain (and its "www" sub-domain) resolve to the IP of a server which hosts the files in our bucket. Who knows the exact IP ? Amazon does. So essentially we need to tell Namecheap to delegate resolving this particular host name to Amazon.

This is what [DNS name servers](https://en.wikipedia.org/wiki/Name_server) are for; they allow this kind of delegation. For Amazon, this type of functionality can be accessed through its [Route 53](https://aws.amazon.com/route53/) service, which allows us to create hosted zones. A hosted zone is essentially Amazon's way of allowing us to create a [DNS zone](https://en.wikipedia.org/wiki/DNS_zone) and its associated [zone files](https://en.wikipedia.org/wiki/Zone_file).

For this we have the [`aws route53 create-hosted-zone` command](https://docs.aws.amazon.com/cli/latest/reference/route53/create-hosted-zone.html); the `--name` parameter is the domain, and the `--caller-reference` can be any string that is unique for every invocation; normally a timestamp is used, as produced by the [`date` command](https://www.cyberciti.biz/faq/unix-date-command-howto-see-set-date-time/); the quotes around the timestamp are important as it contains spaces:

```
$ aws route53 create-hosted-zone --name glorious.website --caller-reference "$(date)"
{
    "Location": "https://route53.amazonaws.com/2013-04-01/hostedzone/ZDDQ0TEAVANOW",
    "HostedZone": {
        "Id": "/hostedzone/ZDDQ0TEAVANOW",
        "Name": "glorious.website.",
        "CallerReference": "10 Feb 2020 21:40:02",
        "Config": {
            "PrivateZone": false
        },
        "ResourceRecordSetCount": 2
    },
    "ChangeInfo": {
        "Id": "/change/C083657918IENJDLM30TJ",
        "Status": "PENDING",
        "SubmittedAt": "2020-02-10T21:40:05.108Z"
    },
    "DelegationSet": {
        "NameServers": [
            "ns-1566.awsdns-03.co.uk",
            "ns-1180.awsdns-19.org",
            "ns-859.awsdns-43.net",
            "ns-82.awsdns-10.com"
        ]
    }
}
```

We get a JSON response, and the most important piece of information there is the  `DelegationSet.NameServers` array, which represents AWS name servers, to be used in the last step of this section. But first, we need to create a record in the hosted zone. According to [the docs](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/RoutingToS3Bucket.html), for an S3 bucket website we need an "Alias" record set.

At this point it would be instructive to access the [Route 53 MC](https://console.aws.amazon.com/route53/home#hosted-zones:); if you go there you should see the newly created hosted zone listed as a link. If you access the link, you'll be taken to a screen for managing the hosted zone, and there should be some button for creating record sets. When clicked, if you select the "Alias" option, the "Alias Target" text box should include the website bucket as an auto-complete option - but in this case it won't.

If the bucket is not listed, it could be because:

> - The name of the bucket is the same as the name of the record that you're creating. 
> - The bucket is configured as a website endpoint.
> - The bucket was created by the current AWS account.

It is actually fairly common to miss at least one thing. In our case, the bucket name is "glorious-website", whereas the domain we want to alias is "glorious.website" - and Amazon isn't going to let us do that. So we must rename the bucket. Unfortunatelly there is no "rename" CLI command, so the process is a bit more involved - we need to create a new bucket with the correct name, sync it with the old one, and then also make it a website and apply the JSON policy. Note that we can't reuse the policy file, because we need to update the bucket [ARN](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html).

```sh
$ aws s3 mb s3://glorious.website
make_bucket: glorious.website

$ aws s3 sync s3://glorious-website s3://glorious.website
copy: s3://glorious-website/blog/first-post/index.html to s3://glorious.website/blog/first-post/index.html
copy: s3://glorious-website/style.css to s3://glorious.website/style.css
copy: s3://glorious-website/blog/first-post/image.svg to s3://glorious.website/blog/first-post/image.svg
copy: s3://glorious-website/index.html to s3://glorious.website/index.html

$ aws s3 rb --force s3://glorious-website
delete: s3://glorious-website/index.html
delete: s3://glorious-website/style.css
delete: s3://glorious-website/blog/first-post/image.svg
delete: s3://glorious-website/blog/first-post/index.html
remove_bucket: glorious-website

$ aws s3 website s3://glorious.website --index-document index.html

$ tee ./policy.json <<EOF
{
  "Version":"2012-10-17",
  "Statement":[{
    "Sid":"PublicReadGetObject",
    "Effect":"Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::glorious.website/*"
  }]
}
EOF

$ aws s3api put-bucket-policy --bucket glorious.website --policy file://policy.json
```

With the bucket sorted, we can create the record set with the [`change-resource-record-sets` command](https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html). It takes JSON as input; the structure isn't too complicated, but there is some legwork that we need to perform. The value for the `ResourceRecordSet.AliasTarget.HostedZoneId` field depends on the AWS region the bucket was created in. The list of hosed zone ids corresponding to each region is [here](https://docs.aws.amazon.com/general/latest/gr/s3.html#s3_website_region_endpoints); and since our bucket is in `eu-west-1`, we're going to use "Z1BKCTXD74EZPE".

Also note that Route 53 requires we use `A` as the record type. Normally an `A` record points directly to a concrete IPv4 address - but here it's an indirect reference, similar to a `CNAME`. Arguably, Amazon should have called this something else, like most other DNS providers do; not `CNAME` as that would preclude usage on a root domain, but `ALIAS` or something like that. That being said, DNS queries for "glorious.website" _will_ result in an `A` record with a concrete IP as its payload - so make of this what you will.

```
$ tee ./alias-record-set.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "glorious.website",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z1BKCTXD74EZPE",
          "DNSName": "s3-website-eu-west-1.amazonaws.com.",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

$ aws route53 change-resource-record-sets --hosted-zone-id ZDDQ0TEAVANOW --change-batch file://alias-record-set.json
{
    "ChangeInfo": {
        "Id": "/change/C00881342NTAFY5GN1BMZ",
        "Status": "PENDING",
        "SubmittedAt": "2020-02-11T10:06:06.059Z"
    }
}

```

With the hosted zone setup, all we need to do now is letting the registrar know that we want Amazon to handle resolving the domain. We do this by setting [`NS` records](https://www.plesk.com/wiki/ns-record/), referencing Amazon name servers. We need to use the name servers corresponding to the hosted zone created for the domain; these are revealed when the zone is created, as we saw, or with the [`aws route53 list-resource-record-sets` command](https://docs.aws.amazon.com/cli/latest/reference/route53/list-resource-record-sets.html):

```
$ aws route53 list-resource-record-sets --hosted-zone-id ZDDQ0TEAVANOW
{
    "ResourceRecordSets": [
        {
            "Name": "glorious.website.",
            "Type": "A",
            "AliasTarget": {
                "HostedZoneId": "Z1BKCTXD74EZPE",
                "DNSName": "s3-website-eu-west-1.amazonaws.com.",
                "EvaluateTargetHealth": false
            }
        },
        {
            "Name": "glorious.website.",
            "Type": "NS",
            "TTL": 172800,
            "ResourceRecords": [
                {
                    "Value": "ns-1566.awsdns-03.co.uk."
                },
                {
                    "Value": "ns-1180.awsdns-19.org."
                },
                {
                    "Value": "ns-859.awsdns-43.net."
                },
                {
                    "Value": "ns-82.awsdns-10.com."
                }
            ]
        },
        {
            "Name": "glorious.website.",
            "Type": "SOA",
            "TTL": 900,
            "ResourceRecords": [
                {
                    "Value": "ns-1566.awsdns-03.co.uk. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"
                }
            ]
        }
    ]
}
```

The exact steps for this depend on the registrar; [here's a link](https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain) to a Namecheap guide. I actually kept getting the generic "Oops, something went wrong. Please try again." error message while I was trying to set the NS records. By inspecting the response payload, I saw that the message was "A host object with that hostname already exists." - still not clear so I had to contact support - as it turns out, they require entering the name servers _without_ the terminating dot - which technically is incorrect, as the [FQDN](https://en.wikipedia.org/wiki/Fully_qualified_domain_name) _includes_ the dot. Lesson here is, be prepared for dealing with this kind of shenanigans.

Once the name servers are set, the hard part begins... waiting. By making a `dig` request, you can find out the `TTL` for a domain:

```
$ dig +noall +answer glorious.website
glorious.website.       5       IN      A       52.218.40.164

$ dig +noall +answer www.glorious.website
www.glorious.website.   552     IN      CNAME   parkingpage.namecheap.com.
parkingpage.namecheap.com. 30   IN      A       198.54.117.217
parkingpage.namecheap.com. 30   IN      A       198.54.117.211
parkingpage.namecheap.com. 30   IN      A       198.54.117.215
```

As you might remember, the second column represents the `TTL`, and if you run a `dig` command multiple times in succession, you should see it going down, as it is measured in seconds. You can think of the `TTL` as `TTW` - time to wait, because only when it reaches 0 will a DNS server refresh its copies of the expired records.

You can try clearing the local DNS cache, but when your computer makes a request for a new set of records, the DNS server it reaches might itself serve a cached response. You can "evict" the local cache, but not the one from remote servers you don't control - a DNS server will fetch the record set once, and cache them until the TTL expires. And since DNS is decentralized, even if you control the authoritative DNS server for a domain, you can't reliably know which intermediate servers will be contacted; the only thing you can rely on is changes will propagate _eventually_ because `TTL`s will expire. If you plan on making DNS changes on a domain, you can preemptively set a low TTL so that changes will propagate more quickly, and then raise it back.

In the `dig` example above, for the root domain the TTL is 5 seconds so you should be able to access the website using the "glorious.website" domain almost instantaneously.

But the `CNAME` record for the "www"-prefixed domain, which points to the parking page, will live for another 552 seconds, or about 9 minutes. Once it expires, we won't have any records for the "www"-prefixed domain, and the "answer" section of `dig`'s output should be empty:

```
$ dig +noall +answer www.glorious.website
$
```

If you try to access either URL in a web browser, what you get depends on the browser - sometimes browsers automatically go to the "www" version, even if you explicitly omit it - so I prefer using `httpie` for this kind of tests:

```
$ http http://glorious.website
HTTP/1.1 200 OK
Content-Length: 259
Content-Type: text/html
Date: Tue, 11 Feb 2020 13:49:15 GMT
ETag: "4d5aea333733346209b576265ee4f46f"
Last-Modified: Tue, 11 Feb 2020 09:04:32 GMT
Server: AmazonS3
x-amz-id-2: DFvJ1ddOrUigFskGAJeG3nxVBwp6ZMCw3+d9sPAXAvfcRTz52BWlsjnkxP341zxJQMywppM2vrU=
x-amz-request-id: 78783033E4E3CE9E

<html>
    <head>
        <link rel="stylesheet" type="text/css" href="/style.css"/>
        <title>Glorious Website</title>
    </head>
    <body>
      <h1>Version 1</h1>
      <p>Go to <a href="/blog/first-post">blog/first-post</a></p>
    </body>
</html>

$ http http://www.glorious.website

http: error: ConnectionError: HTTPConnectionPool(host='www.glorious.website', port=80): Max retries exceeded with url: / (Caused by NewConnectionError('<urllib3.connection.HTTPConnection object at 0x000001EB8C9E81
30>: Failed to establish a new connection: [Errno 11001] getaddrinfo failed')) while doing a GET request to URL: http://www.glorious.website/
```

The root domain works and resolves to the "glorious" website. But `www.glorious.website` times out - that's because the `TTL` for the `CNAME` record (which aliased the "www"-prefixed domain to the parking page) reached 0, and there are no other records for that domain.

To address this, first we need to create another alias (an indirect `A` record) for the "www" sub-domain, like we did with the root domain:

```
$ tee ./alias-www-record-set.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.glorious.website",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z1BKCTXD74EZPE",
          "DNSName": "s3-website-eu-west-1.amazonaws.com.",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

$ aws route53 change-resource-record-sets --hosted-zone-id ZDDQ0TEAVANOW --change-batch file://alias-www-record-set.json
{
    "ChangeInfo": {
        "Id": "/change/C00881342NTAFY5GN1BMZ",
        "Status": "PENDING",
        "SubmittedAt": "2020-02-11T10:06:06.059Z"
    }
}
```

Once the record is created, `dig` will manage to resolve the www domain - but HTTP requests to it will result in a `404` page, complaining that there is no such bucket, `www.glorious.website`:

```
$ dig +noall +answer www.glorious.website
www.glorious.website.   5       IN      A       52.218.96.188

$ http --headers http://www.glorious.website
HTTP/1.1 404 Not Found
Content-Length: 367
Content-Type: text/html; charset=utf-8
Date: Tue, 11 Feb 2020 21:47:02 GMT
Server: AmazonS3

<html>
<head><title>404 Not Found</title></head>
<body>
<h1>404 Not Found</h1>
<ul>
<li>Code: NoSuchBucket</li>
<li>Message: The specified bucket does not exist</li>
<li>BucketName: www.glorious.website</li>
</ul>
<hr/>
</body>
</html>
```

That is because S3 website servers always expect to find a bucket with a name matching the domain - unless we use the long bucket URL. But we don't have to replicate the existing bucket; instead, S3 has a special type of bucket for this purpose, which can't contain any objects and the only purpose it serves is to redirect requests to another bucket. So, we need to create it, and configure it with the [`aws s3api put-bucket-website` command](https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-website.html) so that it redirects to the other bucket/domain:

```
$ aws s3 mb s3://www.glorious.website

$ tee ./redirect-www-bucket.json <<EOF
{
    "RedirectAllRequestsTo": {
      "HostName": "glorious.website",
      "Protocol": "http"
    }
}
EOF

$ aws s3api put-bucket-website --bucket www.glorious.website --website-configuration file://redirect-www-bucket.json
```

Everything should work now - if you open the "www" domain in a browser, you'll be redirected to the non-www domain. This is done via a `301` HTTP redirect, which browsers follow automatically (using the value of the `Location` header as the destination) - but `httpie` [doesn't follow redirects](https://httpie.org/doc#http-redirects) unless we use the `--follow` parameter:

```
$ http http://www.glorious.website
HTTP/1.1 301 Moved Permanently
Content-Length: 0
Date: Tue, 11 Feb 2020 22:05:28 GMT
Location: http://glorious.website/
Server: AmazonS3

$ http --follow http://www.glorious.website
HTTP/1.1 200 OK
Content-Length: 259
Content-Type: text/html
Date: Tue, 11 Feb 2020 22:10:21 GMT
ETag: "4d5aea333733346209b576265ee4f46f"
Last-Modified: Tue, 11 Feb 2020 09:04:32 GMT
Server: AmazonS3

<html>
    <head>
        <link rel="stylesheet" type="text/css" href="/style.css"/>
        <title>Glorious Website</title>
    </head>
    <body>
      <h1>Version 1</h1>
      <p>Go to <a href="/blog/first-post">blog/first-post</a></p>
    </body>
</html>
```

## Problems

The website is up and running at the correct domain, but we have a few issues with it.

### Compression

When talking about websites, there are two broad categories of compression - build time, and run time. Built time compression normally takes the form of ["minification"](https://en.wikipedia.org/wiki/Minification_(programming)) but since we don't have a build process, we're not going to do anything about this.

The second type of compression is performed automatically by web servers, "on-the-fly". For example, `nginx` has the [`gzip on` directive](https://docs.nginx.com/nginx/admin-guide/web-server/compression/), but it's not enabled by default. So when a web browser (or a tool like `httpie` or `curl`) make a request for a file, `nginx` will serve it as-is. However, if the `gzip on` directive is used, it will check the `Accept-Encoding` request header, and if it includes `gzip`, then it will actually compress the file in the ["gzip"](https://en.wikipedia.org/wiki/Gzip) format before sending the response, and also include the `Content-Encoding` response header with the value "gzip" - so the client knows that the response is encoded and should use "gzip" to decode it.

But we're just hosting a static website on S3, so there is no web server that we can configure. And you can see from the response headers above that there is no `Accept-Encoding: gzip` header - so no "on-the-fly" compression is performed, all files are served uncompressed.

### HTTPS

The second issue is that we're serving the website unencrypted, over HTTP, instead of HTTPS. Browsers will penalize us for that, by marking the connection to the website as "insecure" - which it is. Aside from privacy and security concerns, there are [other technical reasons](https://developers.google.com/web/fundamentals/security/encrypt-in-transit/why-https) for using HTTPS - many newer features will only work if the connection is over HTTPS, and even some older functionality is "retrofitted" to also require HTTPS.

### Caching

When using a static website hosting service, we don't have much control over caching behaviour but at the least we must understand how it is setup. Generally this means knowing what caching headers are sent, and in what circumstances they change.

For this I prefer tools like `httpie` and `curl`, at least initially, because there are many factors that influence browser caching behaviour. I'll omit headers that are not relevant to caching from output.

```
$ http --headers http://glorious.website
HTTP/1.1 200 OK
ETag: "4d5aea333733346209b576265ee4f46f"
Last-Modified: Tue, 11 Feb 2020 09:04:32 GMT
```

The `ETag` value is, theoretically, supposed to be a fingerprint - normally a hash of the requested resource but the exact hashing algorithm is to be considered an implementation detail. Browsers will cache it (assuming `Cache-Control` allows it), and the next time the same URL is requested, will check if the cached version is expired. "Expiredness" is generally determined based on the values of the `Expires` or `Cache-Control` headers, which would have been stored along with the cached resource. If the cache is expired, a new request will be made.

However, in this case we don't have `Expires` or `Cache-Control` - so browsers can't know if a resource is expired. But, they have a fingerprint and a modification time stamp. The fingerprint is generally more accurate, and will be used in preference to the `Last-Modified` value but any of these headers can be used for this purpose. To ensure they don't serve outdated content, browsers still need to make a HTTP request - but they can potentially avoid re-downloading it.

Let's use the [`touch` command](http://man7.org/linux/man-pages/man1/touch.1.html) to test what happens when the "last modified" attribute of the file changes, but the file contents remain the same. Using `touch` is equivalent to opening the file in an editor and saving it, without making any changes.

```
$ cd ~/code/glorious-website # change to the folder with the website

$ md5sum index.html # calculate the MD5 hash of the file contents
4d5aea333733346209b576265ee4f46f *index.html

$ touch index.html # change the "last modified" time stamp on the file

$ md5sum index.html # check that file contents are the same
4d5aea333733346209b576265ee4f46f *index.html

$ aws s3 sync . s3://glorious.website --exclude ".git/*"
upload: .\index.html to s3://glorious.website/index.html
```

We can see that `s3` decided to re-upload the file, even if only the time stamp changed. Requesting the root of a website is normally the same as requesting the `index.html` file, so let's see how the headers behave. 

```
$ http --headers http://glorious.website
Date: Wed, 12 Feb 2020 13:20:35 GMT
ETag: "4d5aea333733346209b576265ee4f46f"
Last-Modified: Wed, 12 Feb 2020 13:18:41 GMT
```

Here we can see why `ETag`s are preferred to `Last-Modified` - because the former is based on the actual contents of the file (and didn't change), whereas the latter is commonly based on file system meta-information (and did change). Also note that the value of the `ETag` is actually the MD5 hash - although, as mentioned before, this is an implementation detail and servers are free to choose whatever hashing algorithm they find suitable.

Assuming a browser has a cached resource along with it's `ETag`, on subsequent requests for the same resource it will include the `If-None-Match` header, with the value of the cached resources `ETag` ("4d5aea333733346209b576265ee4f46f", in our case). Actually this is true for any compliant HTTP client, not just browsers, so we can try this with `httpie`. Note that _request_ headers are set after the URL; the `--headers` option doesn't set any headers, it only means we're only interested in the _response_ headers and don't care about the response body. 

```
$ http --headers http://glorious.website If-None-Match:"4d5aea333733346209b576265ee4f46f" 
HTTP/1.1 304 Not Modified
Date: Wed, 12 Feb 2020 13:34:59 GMT
ETag: "4d5aea333733346209b576265ee4f46f"
Last-Modified: Wed, 12 Feb 2020 13:18:41 GMT
```

The server (Amazon S3) matched the `ETag` in the requests `If-None-Match` header with the `ETag` for the current version of the object, and since they're the same, it sent a `304 Not Modified` response - which means the client can use the cached version. This isn't such a big win for small files; while a `304` response doesn't carry a payload (the "body" is empty), a small payload would not have mattered much as the main cost here is the time it takes to receive the response. If we don't include the `If-None-Match`, we'll get a `200` response with the body containing the page's HTML.

If an HTTP response includes a `Last-Modified` header, clients can cache the response along with the value of this header, to be sent with subsequent requests as the value of the `If-Modified-Since` header. Since S3 responses include both `ETag` and `Last-Modified`, re-validation requests will include both `If-None-Match` and `If-Modified-Since` headers - but, as mentioned before, servers will generally prefer `If-None-Match` as it is based on actual file contents.

Something else to keep in mind is that caching behaviour is often different per file or [<abbr title="Multipurpose Internet Mail Extensions">MIME</abbr>](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) type - HTML files are generally not cached, whereas scripts and images are. So it is worth making requests for other file types as well, which I did and it looks like on S3 all file types are treated the same.

So the caching situation isn't terrible, but there is certainly room for improvement because we could potentially avoid the HTTP roundtrip entirely if we had `Expires` or `Cache-Control` headers. This [is possible](https://serverfault.com/a/770469) but it's not straightforward; we'll look at a compromise solution using CloudFront, in an upcoming second part for this article.

## Conclusion

We covered setting up the AWS CLI and using it to upload a static website to S3; then we used Route 53 to configure a custom domains for it, and redirect the "www"-prefixed domain to the root domain. As we saw in the last section, there is room for improvement - primarily, we need to setup HTTPS encryption; we'll do that in the second part of this tutorial, using AWS CloudFront and we'll also add compression and improve caching.