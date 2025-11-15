import { Header } from "@/components/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Lock, Network, CheckCircle, AlertCircle, FileText, Scale } from "lucide-react";

export default function Info() {
  return (
    <div className="flex h-screen w-full">
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b">
          <Header />
        </header>
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
                System Information
              </h1>
              <p className="text-muted-foreground">
                Learn about recent upgrades and our legal policies
              </p>
            </div>

            <Tabs defaultValue="upgrades" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upgrades" data-testid="tab-upgrades">
                  System Upgrades
                </TabsTrigger>
                <TabsTrigger value="legal" data-testid="tab-legal">
                  Legal Information
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upgrades" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Shield className="h-6 w-6 text-cyan-500" />
                      <CardTitle>Decentralized Security Network</CardTitle>
                    </div>
                    <CardDescription>
                      Production-ready peer-to-peer infrastructure with military-grade encryption
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Lock className="h-5 w-5 text-cyan-500 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="font-semibold">Cryptographic Protection</h4>
                          <p className="text-sm text-muted-foreground">
                            Every message is digitally signed using Ed25519 encryption. Your device 
                            generates and securely stores encryption keys in a protected database with 
                            obfuscation, so they cannot be easily extracted.
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-cyan-500 mt-0.5" />
                        <div className="space-y-2">
                          <h4 className="font-semibold">Tamper-Proof Verification</h4>
                          <p className="text-sm text-muted-foreground">
                            When you receive messages, the system performs multiple security checks:
                          </p>
                          <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                            <li>✓ Signature presence verification</li>
                            <li>✓ Content integrity checking (detects tampering)</li>
                            <li>✓ Cryptographic signature authentication</li>
                            <li>✓ Replay attack prevention</li>
                          </ul>
                          <p className="text-sm text-muted-foreground">
                            If any check fails, the message is automatically rejected.
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-start gap-3">
                        <Network className="h-5 w-5 text-cyan-500 mt-0.5" />
                        <div className="space-y-2">
                          <h4 className="font-semibold">Intelligent Network Algorithm</h4>
                          <p className="text-sm text-muted-foreground">
                            Uses an IOTA Tangle-inspired algorithm for distributed consensus:
                          </p>
                          <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                            <li>• Smart message reference selection</li>
                            <li>• Automatic confirmation weight calculation</li>
                            <li>• Circular reference and conflict detection</li>
                            <li>• Automatic pruning of old messages (7-day retention)</li>
                          </ul>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-cyan-500" />
                          Attack Resistance
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="destructive" className="gap-1">❌</Badge>
                            <span className="text-muted-foreground">Payload Tampering</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="destructive" className="gap-1">❌</Badge>
                            <span className="text-muted-foreground">Hash Tampering</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="destructive" className="gap-1">❌</Badge>
                            <span className="text-muted-foreground">Signature Forgery</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="destructive" className="gap-1">❌</Badge>
                            <span className="text-muted-foreground">Replay Attacks</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="destructive" className="gap-1">❌</Badge>
                            <span className="text-muted-foreground">Man-in-Middle</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="gap-1 text-cyan-500 border-cyan-500">✓</Badge>
                            <span className="text-muted-foreground">All Blocked</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Wavelength Encoding System</CardTitle>
                    <CardDescription>
                      Advanced visual communication with dual-channel verification
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Spectrum-Based Encoding</h4>
                      <p className="text-sm text-muted-foreground">
                        Messages are encoded as colored light sequences mapped to the visible spectrum:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                        <li>• Letters (A-Z): 380-740nm wavelength range</li>
                        <li>• Numbers (0-9): 750-795nm wavelength range</li>
                        <li>• Punctuation: 800-895nm wavelength range</li>
                        <li>• Dual-channel verification (color + brightness)</li>
                      </ul>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-semibold">Calibration Sequence</h4>
                      <p className="text-sm text-muted-foreground">
                        Optional calibration mode adapts to different lighting conditions and camera 
                        sensors for reliable cross-device communication.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="legal" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-6 w-6 text-cyan-500" />
                      <CardTitle>Terms of Service</CardTitle>
                    </div>
                    <CardDescription>Last updated: November 2025</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold mb-2">1. Acceptance of Terms</h4>
                        <p className="text-sm text-muted-foreground">
                          By accessing and using Visual Signal Encoder/Decoder ("the Service"), you accept 
                          and agree to be bound by these Terms of Service. If you do not agree to these terms, 
                          please do not use the Service.
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">2. Description of Service</h4>
                        <p className="text-sm text-muted-foreground">
                          Visual Signal provides a web-based application for encoding text messages into 
                          visual color sequences and decoding them using camera-based scanning. The Service 
                          includes peer-to-peer messaging capabilities and social features.
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">3. User Accounts and Authentication</h4>
                        <p className="text-sm text-muted-foreground">
                          You must provide accurate mobile number information for SMS verification. You are 
                          responsible for maintaining the confidentiality of your account and for all activities 
                          under your account. The Service uses cryptographic keys stored locally on your device.
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">4. User Conduct</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          You agree not to:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                          <li>• Use the Service for any unlawful purpose</li>
                          <li>• Transmit harmful, offensive, or illegal content</li>
                          <li>• Attempt to interfere with the Service's operation or security</li>
                          <li>• Forge headers or manipulate identifiers to disguise message origins</li>
                          <li>• Attempt to compromise other users' cryptographic keys</li>
                        </ul>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">5. Decentralized Network</h4>
                        <p className="text-sm text-muted-foreground">
                          The Service operates a peer-to-peer network where your device acts as a network node. 
                          Messages are cryptographically signed and verified. The distributed architecture means 
                          that messages may be relayed through other users' devices.
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">6. Intellectual Property</h4>
                        <p className="text-sm text-muted-foreground">
                          This Service is open source software. You retain all rights to content you create. 
                          The Service's source code and documentation are subject to the terms of the MIT License.
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">7. Disclaimer of Warranties</h4>
                        <p className="text-sm text-muted-foreground">
                          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR 
                          IMPLIED. We do not guarantee uninterrupted or error-free service. While we implement 
                          security measures, we cannot guarantee absolute security of transmitted data.
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">8. Limitation of Liability</h4>
                        <p className="text-sm text-muted-foreground">
                          To the fullest extent permitted by law, we shall not be liable for any indirect, 
                          incidental, special, consequential, or punitive damages resulting from your use or 
                          inability to use the Service.
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">9. Modifications to Service</h4>
                        <p className="text-sm text-muted-foreground">
                          We reserve the right to modify or discontinue the Service at any time with or without 
                          notice. We shall not be liable for any modification, suspension, or discontinuance.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Scale className="h-6 w-6 text-cyan-500" />
                      <CardTitle>Privacy Policy</CardTitle>
                    </div>
                    <CardDescription>Last updated: November 2025</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold mb-2">1. Information We Collect</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          We collect the following information:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                          <li>• Mobile number (for authentication via SMS verification)</li>
                          <li>• Country code (for international SMS delivery)</li>
                          <li>• Location data (latitude/longitude, if you grant permission)</li>
                          <li>• Profile information (display name, bio, avatar URL - optional)</li>
                          <li>• Messages you create and send</li>
                          <li>• Social connections (followers/following relationships)</li>
                        </ul>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">2. Local Cryptographic Keys</h4>
                        <p className="text-sm text-muted-foreground">
                          Cryptographic keys for message signing are generated and stored locally in your 
                          browser's IndexedDB with obfuscation. These keys never leave your device and are 
                          not transmitted to our servers.
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">3. How We Use Your Information</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Your information is used to:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                          <li>• Authenticate your account via SMS verification</li>
                          <li>• Enable peer-to-peer messaging between users</li>
                          <li>• Display your profile to other users</li>
                          <li>• Facilitate social features (follow/unfollow, discovery)</li>
                          <li>• Store and retrieve your saved messages</li>
                        </ul>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">4. Third-Party Services</h4>
                        <p className="text-sm text-muted-foreground">
                          We use Twilio Programmable Messaging API for SMS verification. Your mobile number 
                          is transmitted to Twilio solely for sending verification codes. Please review 
                          Twilio's Privacy Policy for their data handling practices.
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">5. Data Storage and Security</h4>
                        <p className="text-sm text-muted-foreground">
                          Your data is stored in a PostgreSQL database. Messages in the peer-to-peer network 
                          are cryptographically signed using Ed25519 signatures. We implement industry-standard 
                          security measures including:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                          <li>• Hash chain integrity verification</li>
                          <li>• Replay attack prevention</li>
                          <li>• Nonce tracking with expiration</li>
                          <li>• Secure key storage with obfuscation</li>
                        </ul>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">6. Data Sharing and Disclosure</h4>
                        <p className="text-sm text-muted-foreground">
                          We do not sell your personal information. Messages you send via the peer-to-peer 
                          network may be relayed through other users' devices as part of the decentralized 
                          architecture. Your profile information (display name, bio, avatar) is visible to 
                          other authenticated users.
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">7. Data Retention</h4>
                        <p className="text-sm text-muted-foreground">
                          DAG vertices (peer-to-peer message records) are automatically pruned after 7 days 
                          unless anchored. Saved messages remain until you delete them. User accounts and 
                          profile information persist until account deletion.
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">8. Your Rights</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          You have the right to:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                          <li>• Access your personal information</li>
                          <li>• Update your profile information</li>
                          <li>• Delete your account and associated data</li>
                          <li>• Opt out of location tracking (deny browser permission)</li>
                        </ul>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">9. Camera and Location Permissions</h4>
                        <p className="text-sm text-muted-foreground">
                          The Scanner feature requires camera access to decode visual signals. Location 
                          permission is optional and only requested once during signup. You can deny or 
                          revoke these permissions through your browser settings at any time.
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">10. Contact</h4>
                        <p className="text-sm text-muted-foreground">
                          For privacy-related questions or to exercise your rights, please contact us through 
                          the application support channels.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Open Source License</CardTitle>
                    <CardDescription>MIT License</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      This software is released under the MIT License. Permission is granted, free of charge, 
                      to any person obtaining a copy of this software to use, copy, modify, merge, publish, 
                      distribute, sublicense, and/or sell copies of the Software, subject to the conditions 
                      in the LICENSE file.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
