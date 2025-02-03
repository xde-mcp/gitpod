/**
 * Copyright (c) 2025 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { OrganizationSettings } from "@gitpod/public-api/lib/gitpod/v1/organization_pb";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Heading2, Heading3, Subheading } from "../components/typography/headings";
import { useIsOwner, useListOrganizationMembers } from "../data/organizations/members-query";
import { useOrgSettingsQuery } from "../data/organizations/org-settings-query";
import { useCurrentOrg } from "../data/organizations/orgs-query";
import { useUpdateOrgSettingsMutation } from "../data/organizations/update-org-settings-mutation";
import { OrgSettingsPage } from "./OrgSettingsPage";
import { ConfigurationSettingsField } from "../repositories/detail/ConfigurationSettingsField";
import { useDocumentTitle } from "../hooks/use-document-title";
import { useToast } from "../components/toasts/Toasts";
import type { PlainMessage } from "@bufbuild/protobuf";
import { InputField } from "../components/forms/InputField";
import { TextInput } from "../components/forms/TextInputField";
import { LoadingButton } from "@podkit/buttons/LoadingButton";
import MDEditor from "@uiw/react-md-editor";
import { Textarea } from "@podkit/forms/TextArea";
import Modal, { ModalFooter, ModalBody, ModalHeader } from "../components/Modal";
import { Button } from "@podkit/buttons/Button";
import { SwitchInputField } from "@podkit/switch/Switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@podkit/dropdown/DropDown";

const sampleMarkdown = `“With Gitpod, you'll boost your productivity and streamline your workflow, giving you the freedom to work how you want while helping our team meet its efficiency goals.”

**Hannah Cole** - CTO Acme, Inc.
`;
const gitpodWelcomeSubheading = `Gitpod’s sandboxed, ephemeral development environments enable you to use your existing tools without worrying about vulnerabilities impacting their local machines.`;

export default function TeamOnboardingPage() {
    useDocumentTitle("Organization Settings - Onboarding");
    const { toast } = useToast();
    const org = useCurrentOrg().data;
    const isOwner = useIsOwner();

    const { data: settings } = useOrgSettingsQuery();
    const updateTeamSettings = useUpdateOrgSettingsMutation();

    const [internalLink, setInternalLink] = useState<string | undefined>(undefined);
    const [welcomeMessage, setWelcomeMessage] = useState<string>(sampleMarkdown);
    const [showWelcomeMessage, setShowWelcomeMessage] = useState<boolean>(true);
    const [welcomeMessageEditorOpen, setWelcomeMessageEditorOpen] = useState<boolean>(false);
    const [avatarURL, setAvatarURL] = useState<string | undefined>(undefined);
    const handleUpdateTeamSettings = useCallback(
        async (newSettings: Partial<PlainMessage<OrganizationSettings>>, options?: { throwMutateError?: boolean }) => {
            if (!org?.id) {
                throw new Error("no organization selected");
            }
            if (!isOwner) {
                throw new Error("no organization settings change permission");
            }
            try {
                await updateTeamSettings.mutateAsync({
                    ...settings,
                    ...newSettings,
                });
                toast("Organization settings updated");
            } catch (error) {
                if (options?.throwMutateError) {
                    throw error;
                }
                toast(`Failed to update organization settings: ${error.message}`);
                console.error(error);
            }
        },
        [updateTeamSettings, org?.id, isOwner, settings, toast],
    );

    const handleUpdateInternalLink = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();

            await handleUpdateTeamSettings({ onboardingSettings: { internalLink } });
        },
        [handleUpdateTeamSettings, internalLink],
    );

    useEffect(() => {
        if (settings) {
            setInternalLink(settings.onboardingSettings?.internalLink);
        }
    }, [settings]);

    return (
        <OrgSettingsPage>
            <div className="space-y-8">
                <div>
                    <Heading2>Policies</Heading2>
                    <Subheading>Restrict workspace classes, editors and sharing across your organization.</Subheading>
                </div>
                <ConfigurationSettingsField>
                    <Heading3>Internal dashboard</Heading3>
                    <Subheading>
                        The link to your internal landing page. This link will be shown to your organization members
                        during the onboarding process. You can disable showing a link by leaving this field empty.
                    </Subheading>
                    <form onSubmit={handleUpdateInternalLink}>
                        <InputField label="Internal landing page link" error={undefined} className="mb-4">
                            <TextInput
                                value={internalLink}
                                type="url"
                                placeholder="https://en.wikipedia.org/wiki/Heisenbug"
                                onChange={setInternalLink}
                                disabled={updateTeamSettings.isLoading || !isOwner}
                            />
                        </InputField>
                        <LoadingButton type="submit" loading={updateTeamSettings.isLoading} disabled={!isOwner}>
                            Save
                        </LoadingButton>
                    </form>
                </ConfigurationSettingsField>

                <ConfigurationSettingsField>
                    <Heading3>Welcome message</Heading3>
                    <Subheading>
                        A welcome message to your organization members. This message will be shown to your organization
                        members once they sign up and join your organization.
                    </Subheading>

                    <InputField
                        label="Enabled"
                        hint={<>Enable showing the message to new organization members.</>}
                        id="show-welcome-message"
                    >
                        <SwitchInputField
                            id="show-welcome-message"
                            checked={showWelcomeMessage}
                            disabled={!isOwner || updateTeamSettings.isLoading}
                            onCheckedChange={setShowWelcomeMessage}
                            label=""
                        />
                    </InputField>

                    <span className="text-pk-content-secondary text-sm">
                        Here's a preview of the welcome message that will be shown to your organization members:
                    </span>
                    <WelcomeMessagePreview
                        welcomeMessage={welcomeMessage}
                        setWelcomeMessageEditorOpen={setWelcomeMessageEditorOpen}
                        avatarURL={avatarURL}
                        disabled={!showWelcomeMessage}
                    />

                    <Modal
                        onClose={() => setWelcomeMessageEditorOpen(false)}
                        visible={welcomeMessageEditorOpen}
                        containerClassName="min-[576px]:max-w-[650px]"
                    >
                        <ModalHeader>Edit welcome message</ModalHeader>
                        <ModalBody>
                            <WelcomeMessageEditor
                                welcomeMessage={welcomeMessage}
                                setWelcomeMessage={setWelcomeMessage}
                                disabled={!showWelcomeMessage}
                                avatarURL={avatarURL}
                                setAvatarURL={setAvatarURL}
                            />
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="secondary" onClick={() => setWelcomeMessageEditorOpen(false)}>
                                Cancel
                            </Button>
                            <LoadingButton type="submit" loading={updateTeamSettings.isLoading} disabled={!isOwner}>
                                Save
                            </LoadingButton>
                        </ModalFooter>
                    </Modal>
                </ConfigurationSettingsField>
            </div>
        </OrgSettingsPage>
    );
}

type WelcomeMessagePreviewProps = {
    welcomeMessage: string;
    avatarURL: string | undefined;
    disabled?: boolean;
    setWelcomeMessageEditorOpen: (open: boolean) => void;
};
const WelcomeMessagePreview = ({
    welcomeMessage,
    avatarURL,
    disabled,
    setWelcomeMessageEditorOpen,
}: WelcomeMessagePreviewProps) => {
    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between gap-2 items-center">
                <Heading2 className="py-6">Welcome to Gitpod</Heading2>
                <Button variant="secondary" onClick={() => setWelcomeMessageEditorOpen(true)} disabled={disabled}>
                    Edit
                </Button>
            </div>
            <Subheading>{gitpodWelcomeSubheading}</Subheading>
            {/* todo: sanitize md */}
            <div className="p-8 my-4 bg-pk-surface-secondary text-pk-content-primary rounded-xl flex flex-col gap-5 items-center justify-center">
                {avatarURL && <img src={avatarURL} alt="" className="w-12 h-12 rounded-full" />}
                <MDEditor.Markdown
                    source={welcomeMessage}
                    className="md-preview space-y-4 text-center bg-pk-surface-secondary"
                />
            </div>
        </div>
    );
};

type WelcomeMessageEditorProps = {
    welcomeMessage: string;
    setWelcomeMessage: (welcomeMessage: string) => void;
    disabled?: boolean;
    avatarURL: string | undefined;
    setAvatarURL: (avatarURL: string | undefined) => void;
};
const WelcomeMessageEditor = ({
    welcomeMessage,
    setWelcomeMessage,
    disabled,
    avatarURL,
    setAvatarURL,
}: WelcomeMessageEditorProps) => {
    return (
        <div className="space-y-4">
            <TextInput readOnly value="Welcome to Gitpod" className="cursor-default"></TextInput>
            <Textarea value={gitpodWelcomeSubheading} readOnly className="cursor-default resize-none" />
            <div className="w-full flex justify-center">
                <OrgMemberInput avatarURL={avatarURL} setAvatarURL={setAvatarURL} disabled={disabled} />
            </div>
            <InputField label="Welcome message" error={undefined} className="mb-4" labelHidden>
                <Textarea
                    className="bg-pk-surface-secondary text-pk-content-primary w-full p-4 rounded-xl min-h-[150px]"
                    value={welcomeMessage}
                    placeholder="Write a welcome message to your organization members. Markdown formatting is supported."
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    disabled={disabled}
                />
            </InputField>
        </div>
    );
};

type OrgMemberSelectProps = {
    avatarURL: string | undefined;
    setAvatarURL: (avatarURL: string | undefined) => void;
    disabled?: boolean;
};
const OrgMemberInput = ({ avatarURL, setAvatarURL, disabled }: OrgMemberSelectProps) => {
    const { data: members } = useListOrganizationMembers();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <div className="flex flex-col justify-center items-center gap-2">
                    {avatarURL ? (
                        <img src={avatarURL} alt="" className="w-16 h-16 rounded-full" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-[#EA71DE]" />
                    )}
                    <Button variant="secondary" size="sm">
                        Change Photo
                    </Button>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem key="disabled" onClick={() => setAvatarURL(undefined)}>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-pk-surface-tertiary" />
                        Disable image
                    </div>
                </DropdownMenuItem>
                {members?.map((member) => (
                    <DropdownMenuItem key={member.userId} onClick={() => setAvatarURL(member.avatarUrl)}>
                        <div className="flex items-center gap-2">
                            <img src={member.avatarUrl} alt={member.fullName} className="w-4 h-4 rounded-full" />
                            {member.fullName}
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
