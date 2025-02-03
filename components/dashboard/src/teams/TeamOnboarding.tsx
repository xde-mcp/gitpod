/**
 * Copyright (c) 2025 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import {
    OnboardingSettings_WelcomeMessage,
    OrganizationSettings,
} from "@gitpod/public-api/lib/gitpod/v1/organization_pb";
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

const gitpodWelcomeSubheading = `Gitpod’s sandboxed, ephemeral development environments enable you to use your existing tools without worrying about vulnerabilities impacting their local machines.`;

export default function TeamOnboardingPage() {
    useDocumentTitle("Organization Settings - Onboarding");
    const { toast } = useToast();
    const org = useCurrentOrg().data;
    const isOwner = useIsOwner();

    const { data: settings } = useOrgSettingsQuery();
    const updateTeamSettings = useUpdateOrgSettingsMutation();

    const [internalLink, setInternalLink] = useState<string | undefined>(undefined);
    const [welcomeMessageEditorOpen, setWelcomeMessageEditorOpen] = useState<boolean>(false);

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
                            checked={settings?.onboardingSettings?.welcomeMessage?.enabled ?? false}
                            disabled={!isOwner || updateTeamSettings.isLoading}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    if (!settings?.onboardingSettings?.welcomeMessage?.message) {
                                        toast("Please set up a welcome message first.");
                                        return;
                                    }
                                }

                                updateTeamSettings.mutate({
                                    onboardingSettings: {
                                        welcomeMessage: {
                                            enabled: checked,
                                            message: settings?.onboardingSettings?.welcomeMessage?.message,
                                            featuredMemberId:
                                                settings?.onboardingSettings?.welcomeMessage?.featuredMemberId,
                                        },
                                    },
                                });
                            }}
                            label=""
                        />
                    </InputField>

                    <WelcomeMessageEditor
                        isLoading={updateTeamSettings.isLoading}
                        isOwner={isOwner}
                        isOpen={welcomeMessageEditorOpen}
                        setIsOpen={setWelcomeMessageEditorOpen}
                        handleUpdateTeamSettings={handleUpdateTeamSettings}
                        settings={settings?.onboardingSettings?.welcomeMessage}
                    />

                    {/* todo: add a warning if the welcome message is empty */}

                    <span className="text-pk-content-secondary text-sm">
                        Here's a preview of the welcome message that will be shown to your organization members:
                    </span>
                    <WelcomeMessagePreview
                        welcomeMessage={settings?.onboardingSettings?.welcomeMessage?.message}
                        setWelcomeMessageEditorOpen={setWelcomeMessageEditorOpen}
                        disabled={!isOwner || updateTeamSettings.isLoading}
                    />
                </ConfigurationSettingsField>
            </div>
        </OrgSettingsPage>
    );
}

type WelcomeMessagePreviewProps = {
    welcomeMessage: string | undefined;
    disabled?: boolean;
    setWelcomeMessageEditorOpen: (open: boolean) => void;
};
const WelcomeMessagePreview = ({
    welcomeMessage,
    disabled,
    setWelcomeMessageEditorOpen,
}: WelcomeMessagePreviewProps) => {
    const { data: settings } = useOrgSettingsQuery();
    const avatarUrl = settings?.onboardingSettings?.welcomeMessage?.featuredMemberResolvedAvatarUrl;

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
            {welcomeMessage && (
                <div className="p-8 my-4 bg-pk-surface-secondary text-pk-content-primary rounded-xl flex flex-col gap-5 items-center justify-center">
                    {avatarUrl && <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full" />}
                    <MDEditor.Markdown
                        source={welcomeMessage}
                        className="md-preview space-y-4 text-center bg-pk-surface-secondary"
                    />
                </div>
            )}
        </div>
    );
};

type WelcomeMessageEditorProps = {
    settings: OnboardingSettings_WelcomeMessage | undefined;
    handleUpdateTeamSettings: (
        newSettings: Partial<PlainMessage<OrganizationSettings>>,
        options?: { throwMutateError?: boolean },
    ) => Promise<void>;
    isLoading: boolean;
    isOwner: boolean;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
};
const WelcomeMessageEditor = ({
    handleUpdateTeamSettings,
    isLoading,
    isOwner,
    settings,
    isOpen,
    setIsOpen,
}: WelcomeMessageEditorProps) => {
    const [message, setMessage] = useState<string | undefined>(settings?.message);
    const [featuredMemberId, setFeaturedMemberId] = useState<string | undefined>(settings?.featuredMemberId);

    const updateWelcomeMessage = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            await handleUpdateTeamSettings({
                onboardingSettings: {
                    welcomeMessage: { message, featuredMemberId, enabled: settings?.enabled ?? false },
                },
            });
        },
        [handleUpdateTeamSettings, message, featuredMemberId, settings?.enabled],
    );

    return (
        <Modal onClose={() => setIsOpen(false)} visible={isOpen} containerClassName="min-[576px]:max-w-[650px]">
            <ModalHeader>Edit welcome message</ModalHeader>
            <ModalBody>
                <form id="welcome-message-editor" onSubmit={updateWelcomeMessage} className="space-y-4">
                    <TextInput readOnly value="Welcome to Gitpod" className="cursor-default"></TextInput>
                    <Textarea value={gitpodWelcomeSubheading} readOnly className="cursor-default resize-none" />
                    <div className="w-full flex justify-center">
                        <OrgMemberInput settings={settings} setFeaturedMemberId={setFeaturedMemberId} />
                    </div>
                    <InputField label="Welcome message" error={undefined} className="mb-4" labelHidden>
                        <Textarea
                            className="bg-pk-surface-secondary text-pk-content-primary w-full p-4 rounded-xl min-h-[150px]"
                            value={message}
                            placeholder="Write a welcome message to your organization members. Markdown formatting is supported."
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </InputField>
                </form>
            </ModalBody>
            <ModalFooter>
                <Button variant="secondary" onClick={() => setIsOpen(false)}>
                    Cancel
                </Button>
                <LoadingButton type="submit" loading={isLoading} disabled={!isOwner} form="welcome-message-editor">
                    Save
                </LoadingButton>
            </ModalFooter>
        </Modal>
    );
};

type OrgMemberSelectProps = {
    settings: OnboardingSettings_WelcomeMessage | undefined;
    setFeaturedMemberId: (featuredMemberId: string | undefined) => void;
};
const OrgMemberInput = ({ settings, setFeaturedMemberId }: OrgMemberSelectProps) => {
    const { data: members } = useListOrganizationMembers();

    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(settings?.featuredMemberResolvedAvatarUrl);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <div className="flex flex-col justify-center items-center gap-2">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-[#EA71DE]" />
                    )}
                    <Button variant="secondary" size="sm" type="button">
                        Change Photo
                    </Button>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem
                    key="disabled"
                    onClick={() => {
                        setFeaturedMemberId(undefined);
                        setAvatarUrl(undefined);
                    }}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-pk-surface-tertiary" />
                        Disable image
                    </div>
                </DropdownMenuItem>
                {members?.map((member) => (
                    <DropdownMenuItem
                        key={member.userId}
                        onClick={() => {
                            setFeaturedMemberId(member.userId);
                            setAvatarUrl(member.avatarUrl);
                        }}
                    >
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
