const readline = require('readline');
const AWS = require('aws-sdk');

const aws_profile = process.argv[2];
const region = process.argv[3];
const prefix = process.argv[4];
const hostname = process.argv[5];

//console.error('aws_profile = ' + aws_profile);
//console.error('region = ' + region);
//console.error('prefix = ' + prefix);
//console.error('hostname = ' + hostname);

if (!aws_profile || !prefix || !hostname || !region) {
	console.error('Usage: node <aws_profile from ~/.aws> <rpefix> <ssh hostname> <region>');
	process.exitCode = 3;
	return;
}

if (!hostname.startsWith(prefix)) {
	console.error(`Provided hostname (${hostname}) does not start with provided prefix (${prefix})`);
	process.exitCode = 3;
	return
}

const chain = hostname.substr(prefix.length);

const credentials = new AWS.SharedIniFileCredentials({ profile: aws_profile });
AWS.config.update({
	credentials,
	region,
});

const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });

function format_instance(i) {
	return `${i.PublicIpAddress}\n    InstanceId: ${i.InstanceId}\n    Launched:   ${i.LaunchTime}\n    KeyName:    ${i.KeyName}\n    Tags:\n         ${i.Tags.map(t => t.Key + '=' + t.Value).join('\n         ')}`;
}

const params = {
	Filters: [{
		Name: 'tag:chain',
		Values: [chain],
	}]
};
ec2.describeInstances(params, function (err, data) {
	if (err) {
		console.error(err);
		process.exitCode = 1;
		return;
	}
	if (!data) {
		console.error('Empty response from AWS');
		process.exitCode = 1;
		return;
	}
	if (!data.Reservations) {
		console.error('Unexpected response from AWS: missing "Reservations" field');
		process.exitCode = 1;
		return;
	}
	if (data.Reservations.length === 0) {
		console.error('No instances found');
		return;
	}

	const instances = [];
	for (let r of data.Reservations) {
		for (let i of r.Instances) {
			// State.Code == 16 => instance is "running"
			if (i.State && i.State.Code == 16) {
				instances.push(i);
			}
		}
	}

	if (instances.length == 0) {
		console.error('No running instances found');
		process.exitCode = 2;
		return;
	}

	if (instances.length == 1) {
		console.error('Found 1 running instance: ' + format_instance(instances[0]) + '\n');
		console.log(instances[0].PublicIpAddress);
		return;
	}

	console.error('Found multiple running instances, please select one of them:');
	for (let i = 0; i < instances.length; i += 1) {
		console.error(`    (${i})  ${format_instance(instances[i])}\n`);
	}
	const select = readline.createInterface({
		input: process.stdin,
		output: process.stderr,
	})

	select.question('Enter (number): ', choice => {
		choice = parseInt(choice);
		select.close();
		if (isNaN(choice)) {
			console.error('Unexpected selection');
			process.exit(2);
		}

		if (choice < 0 || choice > instances.length) {
			console.error('Incorrect selection number');
			process.exit(2);
		}
		
		console.log(instances[choice].PublicIpAddress);
	});
});
